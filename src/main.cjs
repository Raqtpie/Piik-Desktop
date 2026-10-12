'use strict';
// Piik Desktop: a minimal native shell + launcher. The official Go and React sharing pipeline is retained.
// macOS capture includes the missing native source-preview command.
const {app,BrowserWindow,WebContentsView,ipcMain,shell,Tray,Menu,dialog,nativeImage,session}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const {PiikSupervisor,findCoreExecutable}=require('./supervisor.cjs');
const {validateSite,resolveSite,withClientFragment,isHttpUrl,safeExternalUrl}=require('./security.cjs');
const {allowedOrigin,displayName,mayAutoFollowAtConnect}=require('./navigation.cjs');
const {normalizeHistory,rememberSite,forgetSite}=require('./history.cjs');
const {browserTabVisibilityScript}=require('./picker-adapter.cjs');
const {inviteActionScript}=require('./invite-adapter.cjs');

const TOPBAR=54;
const REMOTE_PARTITION='persist:piik-desktop-remote';
let win=null,view=null,tray=null,core=null,coreExe=null,config,prefsFile,logDir,logFile,remoteSession;
let activeOrigin='',activeMode='',lastSite='',busy=false,quitting=false,redirectPrompt=false;
const mediaGrants=new Set();
let modalQueue=Promise.resolve();
const rejectedOrigins=new Set();
// Chromium's Local Network Access permission names changed after Electron 37.
const nativeNetworkPermissions=new Set(['localNetworkAccess','local-network-access','local-network','loopback-network']);

function record(kind,message=''){
  if(!logFile)return;
  const text=String(message).slice(0,1800)
    .replace(/(token|password|secret|instanceToken)(["'=:\s]+)([^\s,}]+)/gi,'$1$2[REDACTED]')
    .replace(/([?&](?:token|key|secret|auth|password)=)[^&#\s]+/gi,'$1[REDACTED]');
  try {
    if(fs.existsSync(logFile)&&fs.statSync(logFile).size>3*1024*1024){
      if(fs.existsSync(logFile+'.1'))fs.rmSync(logFile+'.1');fs.renameSync(logFile,logFile+'.1');
    }
    fs.appendFileSync(logFile,`${new Date().toISOString()} [${kind}] ${text.replace(/\r/g,'').trim()}\n`,{mode:0o600});
  }catch{}
}
function defaults(){return {site:'',recentSites:[],mode:'site',language:'zh',theme:'light',allowSiteRedirects:false,minimizeToTray:process.platform==='win32',bounds:{width:1150,height:780}};}
function loadConfig(){
  try{
    const value=JSON.parse(fs.readFileSync(prefsFile,'utf8'));
    const next={...defaults(),...value};
    if(!['site','local','link'].includes(next.mode))next.mode='site';
    if(!['zh','en'].includes(next.language))next.language='zh';
    if(!['light','dark'].includes(next.theme))next.theme='light';
    if(typeof next.site!=='string')next.site='';
    next.recentSites=normalizeHistory(next.recentSites,next.site);
    if(typeof next.allowSiteRedirects!=='boolean')next.allowSiteRedirects=false;
    if(typeof next.minimizeToTray!=='boolean')next.minimizeToTray=defaults().minimizeToTray;
    const bounds=next.bounds||{};
    next.bounds={width:Number.isFinite(bounds.width)?Math.min(7680,Math.max(740,bounds.width)):1150,
      height:Number.isFinite(bounds.height)?Math.min(4320,Math.max(580,bounds.height)):780};
    delete next.hideBrowserCapture;
    return next;
  }catch{return defaults();}
}
function saveConfig(){
  const temp=prefsFile+'.tmp';fs.writeFileSync(temp,JSON.stringify(config,null,2),{mode:0o600});fs.renameSync(temp,prefsFile);
}
function send(type,data={}){if(win&&!win.isDestroyed())win.webContents.send('desktop:state',{type,...data});}
function state(){return {...config,activeMode,activeOrigin,hasCore:!!coreExe,status:busy?'starting':view?'ready':'idle',version:app.getVersion(),platform:process.platform};}
function viewBounds(){
  if(!win||!view||win.isDestroyed())return;
  const [width,height]=win.getContentSize();
  view.setBounds({x:0,y:TOPBAR,width,height:Math.max(100,height-TOPBAR)});
}
function removeView(){
  mediaGrants.clear();
  if(!view)return;
  try{win?.contentView.removeChildView(view);}catch{}
  try{view.webContents.close();}catch(e){record('view-destroy',e.message);}
  view=null;
}
function makeMenus(){
  const menus=[
    {label:'Piik',submenu:[
      {label:'返回首页',accelerator:'CmdOrCtrl+Shift+H',click:()=>void confirmHome()},
      {label:'刷新 Piik 页面',accelerator:'CmdOrCtrl+R',click:()=>void reload()},
      {type:'separator'},
      {label:'诊断日志',click:()=>void shell.openPath(logDir)},
      {label:'Piik 官方文档',click:()=>void shell.openExternal('https://piik.tv/docs/zh/')},
      {type:'separator'},
      ...(process.platform==='darwin'?[{role:'hide'},{role:'hideOthers'},{type:'separator'}]:[]),
      {label:'退出 Piik Desktop',accelerator:'CmdOrCtrl+Q',click:()=>void quit()}
    ]},
    {label:'编辑',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
    {label:'视图',submenu:[{label:'返回首页',accelerator:'Alt+Left',click:()=>void confirmHome()},
      {role:'togglefullscreen'},...(process.argv.includes('--dev')?[{role:'toggleDevTools'}]:[])]},
    {label:'窗口',submenu:[{role:'minimize'},{role:'zoom'},...(process.platform==='darwin'?[{role:'front'}]:[])]}
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
  if(tray)tray.setContextMenu(Menu.buildFromTemplate([
    {label:'打开 Piik Desktop',click:()=>{win?.show();win?.focus();}},
    {label:'返回首页',click:()=>void confirmHome()},
    {label:'刷新',click:()=>void reload()},
    {label:'诊断日志',click:()=>void shell.openPath(logDir)},
    {type:'separator'},
    {label:'退出',click:()=>void quit()}
  ]));
}
function createWindow(){
  win=new BrowserWindow({
    width:config.bounds?.width||1150,height:config.bounds?.height||780,
    minWidth:740,minHeight:580,show:false,title:'Piik Desktop',backgroundColor:'#eaf5f1',
    icon:path.join(__dirname,'../assets/icon.png'),
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,
      sandbox:true,webSecurity:true,allowRunningInsecureContent:false}
  });
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.on('resize',()=>{
    viewBounds();
    if(!win.isMaximized()&&!win.isMinimized())config.bounds=win.getBounds();
  });
  win.on('close',event=>{
    if(quitting)return;
    event.preventDefault();
    // macOS Dock activation must be able to restore this same window. Windows
    // either hides to tray or exits cleanly, never strands a Go child process.
    if(process.platform==='darwin'||(config.minimizeToTray&&tray))win.hide();
    else void quit();
  });
  win.on('closed',()=>{win=null;});
  void win.loadFile(path.join(__dirname,'index.html')).then(()=>win?.show())
    .catch(err=>{record('launcher',err.message);void dialog.showMessageBox({type:'error',message:'无法加载桌面启动页',detail:err.message});});
  makeMenus();
}
function createTray(){
  let icon=nativeImage.createFromPath(path.join(__dirname,'../assets/icon.png'));
  icon=icon.resize({width:process.platform==='darwin'?18:20,height:process.platform==='darwin'?18:20});
  tray=new Tray(icon);tray.setToolTip('Piik Desktop');
  tray.on('click',()=>{win?.show();win?.focus();});
  tray.on('double-click',()=>{win?.show();win?.focus();});
  makeMenus();
}
function currentWebOrigin(request){
  try{return new URL(request).origin;}catch{return '';}
}
/** A branded, sandboxed Electron window. Never grant remote Piik pages access to this IPC. */
function showAppDialog(options){
  return new Promise(resolve=>{
    if(!win||win.isDestroyed()){resolve(0);return;}
    const parent=win;
    const popup=new BrowserWindow({
      parent,modal:true,show:false,frame:false,skipTaskbar:true,
      width:520,height:Math.min(640,(options.fields?.length?390:320)+Math.max(0,Math.ceil((options.buttons?.length||0)/3)-1)*52),
      resizable:false,minimizable:false,maximizable:false,
      backgroundColor:config.theme==='dark'?'#132130':'#f5faf8',
      webPreferences:{preload:path.join(__dirname,'confirm-preload.cjs'),
        contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}
    });
    popup.setMenu(null);
    popup.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    let finished=false;
    function finish(index){
      if(finished)return;
      finished=true;
      ipcMain.removeListener('piik-confirm:choose',onChoose);
      if(!popup.isDestroyed())popup.destroy();
      resolve(index);
    }
    const onChoose=(event,index)=>{
      if(event.sender!==popup.webContents)return;
      finish(Number.isInteger(index)&&index>=0&&index<options.buttons.length?index:0);
    };
    ipcMain.on('piik-confirm:choose',onChoose);
    popup.on('closed',()=>finish(0));
    void popup.loadFile(path.join(__dirname,'confirm.html')).then(()=>{
      if(popup.isDestroyed())return;
      popup.webContents.send('piik-confirm:data',{
        ...options,theme:config.theme,language:config.language
      });
      popup.show();popup.focus();
    }).catch(err=>{record('confirm-dialog',err.message);finish(0);});
  });
}
function askUser(options){
  // Queue permission/redirect prompts; overlapping modal dialogs are confusing.
  const next=modalQueue.then(()=>showAppDialog(options));
  modalQueue=next.then(()=>{},()=>{});
  return next;
}
function i18n(zh,en){return config.language==='en'?en:zh;}
async function confirmHome(){
  if(!view||busy||quitting)return goHome();
  const response=await askUser({
    title:i18n('返回首页？','Return home?'),
    description:i18n('这会断开当前房间，并停止可能正在进行的屏幕分享。','This disconnects the current room and may stop an active screen share.'),
    buttons:[{label:i18n('继续使用','Keep watching')},
      {label:i18n('返回首页','Return home'),style:'danger'}],defaultIndex:0
  });
  if(response!==1)return {ok:false,cancelled:true};
  return goHome();
}
function makeRemoteSession(){
  remoteSession=session.fromPartition(REMOTE_PARTITION);
  remoteSession.setPermissionCheckHandler((wc,permission,requestingOrigin)=>{
    const origin=currentWebOrigin(requestingOrigin||wc?.getURL()||'');
    if(!view||wc!==view.webContents||!activeOrigin||origin!==activeOrigin)return false;
    if(permission==='media')return mediaGrants.has(origin);
    return nativeNetworkPermissions.has(permission)||permission==='clipboard-sanitized-write';
  });
  remoteSession.setPermissionRequestHandler((wc,permission,callback,details)=>{
    const origin=currentWebOrigin(details.requestingUrl||wc.getURL());
    if(!view||wc!==view.webContents||!activeOrigin||origin!==activeOrigin){callback(false);return;}
    if(nativeNetworkPermissions.has(permission)||permission==='clipboard-sanitized-write'){callback(true);return;}
    if(permission==='media'){
      if(mediaGrants.has(origin)){callback(true);return;}
      void askUser({
        title:i18n('请求使用麦克风或摄像头','Microphone or camera access'),
        description:i18n('Piik 站点正在请求媒体设备访问权限。只允许你信任的站点。','A Piik site is requesting access to a media device. Only allow trusted sites.'),
        fields:[{label:i18n('站点','Site'),value:activeOrigin}],
        buttons:[{label:i18n('拒绝','Deny')},{label:i18n('允许','Allow'),style:'primary'}],defaultIndex:0
      }).then(choice=>{
        const allowed=choice===1&&view?.webContents===wc&&activeOrigin===origin;
        if(allowed)mediaGrants.add(origin);
        callback(allowed);
      }).catch(()=>callback(false));return;
    }
    callback(false);
  });
  // Desktop sharing uses the native Piik pipeline exclusively.
  remoteSession.setDisplayMediaRequestHandler((_request,callback)=>callback({}));
}
async function confirmRedirect(input,target){
  if(input===target)return true;
  return (await askUser({
    title:i18n('网站地址发生变化','Website address changed'),
    description:i18n('这个网站将打开另一处地址，是否继续？','This website is taking you to another address. Continue?'),
    fields:[{label:i18n('你输入的地址','Your address'),value:input},{label:i18n('将要打开的地址','New address'),value:target}],
    footnote:i18n('只有你信任的网站才能请求使用屏幕等功能。','Only websites you trust should be allowed to request screen sharing.'),
    buttons:[{label:i18n('取消','Cancel')},{label:i18n('信任并连接','Trust & connect'),style:'primary'}],
    defaultIndex:0
  }))===1;
}
async function runtimeNavigation(target){
  if(redirectPrompt||busy||!isHttpUrl(target))return;
  const safe=safeExternalUrl(target);
  if(!safe)return;
  const origin=currentWebOrigin(target);
  if(rejectedOrigins.has(origin))return;
  redirectPrompt=true;
  try{
    const decision=await askUser({
      title:i18n('网页想打开其他地址','Website wants to open another address'),
      description:i18n('当前网页正准备打开另一个网站，是否继续？','This page wants to open another website. Continue?'),
      fields:[{label:i18n('当前','From'),value:activeOrigin},{label:i18n('目标','To'),value:origin}],
      footnote:i18n('只有你信任的网站才能请求使用屏幕等功能。','Only websites you trust should be allowed to request screen sharing.'),
      buttons:[{label:i18n('取消','Cancel')},{label:i18n('浏览器打开','Open browser')},
        {label:i18n('信任并连接','Trust & reconnect'),style:'primary'}],defaultIndex:0
    });
    if(decision===2)await connect({mode:'site',site:lastSite||origin,forcedOrigin:origin,forcedURL:target,alreadyConfirmed:true});
    else{
      rejectedOrigins.add(origin);
      if(decision===1)await shell.openExternal(safe);
    }
  }catch(err){record('redirect',err.message);}finally{redirectPrompt=false;}
}
function adaptRemotePicker(){
  if(!view||view.webContents.isDestroyed())return;
  view.webContents.executeJavaScriptInIsolatedWorld(1001,[{code:browserTabVisibilityScript()+'\n'+inviteActionScript()}])
    .catch(err=>record('picker-adapter',err.message));
}
function createRemoteView(){
  removeView();
  view=new WebContentsView({webPreferences:{partition:REMOTE_PARTITION,nodeIntegration:false,contextIsolation:true,
    sandbox:true,webSecurity:true,backgroundThrottling:false,allowRunningInsecureContent:false}});
  view.setBackgroundColor('#eaf5f1');
  // Load offscreen. Attaching here would cover the launcher while its toolbar
  // is still hidden, leaving a clipped masthead above an empty page.
  viewBounds();
  const wc=view.webContents;
  wc.on('did-finish-load',adaptRemotePicker);
  wc.setWindowOpenHandler(({url})=>{
    const external=safeExternalUrl(url);
    if(external)void shell.openExternal(external).catch(e=>record('external',e.message));
    return {action:'deny'};
  });
  for(const eventName of ['will-navigate','will-redirect'])wc.on(eventName,(event,target)=>{
    if(allowedOrigin(target,activeOrigin))return;
    event.preventDefault();void runtimeNavigation(target);
  });
  wc.on('did-fail-load',(_event,code,description,url,main)=>{
    if(main&&code!==-3){record('page-error',`${code} ${description} ${currentWebOrigin(url)}`);
      send('error',{error:`网页加载失败 (${code})：${description}`});}
  });
  wc.on('render-process-gone',(_event,details)=>{
    record('renderer-gone',details.reason);send('error',{error:'Piik 页面意外退出，请尝试刷新或返回首页。'});
  });
}
async function connect(args={}){
  if(busy||quitting)return {ok:false,error:'正在处理上一项操作，请稍候'};
  if(!core)return {ok:false,error:'未找到上游 Piik App。请先运行 npm run upstream:prepare。'};
  const mode=args.mode;
  if(!['site','local','link'].includes(mode))return {ok:false,error:'未知连接方式'};
  busy=true;send('status',{status:'starting'});
  try{
    let target='',chosenOrigin='',publicOrigin='';
    if(mode==='site'){
      const input=validateSite(args.site||'');
      lastSite=input;
      let resolved;
      if(args.forcedOrigin){
        resolved={origin:validateSite(args.forcedOrigin),url:args.forcedURL||args.forcedOrigin};
      }else{
        try{resolved=await resolveSite(input);}catch(err){
          record('site-preflight',err.message);resolved={origin:input,url:input+'/'};
          send('notice',{message:'站点预检查未完成，将直接尝试连接。'});
        }
      }
      // Applies only when starting the connection, not to arbitrary navigation.
      const optedIn=typeof args.allowRedirects==='boolean'?args.allowRedirects:config.allowSiteRedirects;
      if(!args.alreadyConfirmed && input!==resolved.origin &&
          !mayAutoFollowAtConnect(input,resolved.origin,optedIn) &&
          !(await confirmRedirect(input,resolved.origin)))return {ok:false,cancelled:true};
      chosenOrigin=resolved.origin;target=withClientFragment(resolved.url);
    }else {
      chosenOrigin='http://127.0.0.1:8787';
      target=withClientFragment(chosenOrigin+'/');
    }
    // Stop the previous session before spawning a new one; don't leave a room broadcasting.
    removeView();activeOrigin='';activeMode='';
    let result;
    try{result=await core.start(mode,mode==='site'?chosenOrigin:'');}
    catch(err){
      if(mode!=='local'||!err.lanAddresses?.length)throw err;
      const addresses=err.lanAddresses;
      const choice=await askUser({
        title:i18n('选择局域网','Choose a LAN'),
        description:i18n('检测到多个网络。请选择与你的观看设备在同一局域网的地址。','Multiple networks are active. Choose the address on the same LAN as your viewers.'),
        buttons:[{label:i18n('取消','Cancel')},...addresses.map(address=>({label:address,style:'primary'}))],defaultIndex:0
      });
      if(!choice)return {ok:false,cancelled:true};
      result=await core.start(mode,'',addresses[choice-1]);
    }
    if(mode!=='site')publicOrigin=result.publicOrigin||'';
    activeOrigin=chosenOrigin;activeMode=mode;
    config.mode=mode;saveConfig();
    rejectedOrigins.clear();
    send('loading',{mode,origin:chosenOrigin});
    createRemoteView();
    await view.webContents.loadURL(target);
    win.contentView.addChildView(view);viewBounds();
    if(mode==='site'){config.site=lastSite;config.recentSites=rememberSite(config.recentSites,lastSite);saveConfig();}
    send('connected',{mode,origin:chosenOrigin,display:displayName(mode,chosenOrigin),publicOrigin});
    return {ok:true,mode,origin:chosenOrigin,publicOrigin,savedSite:mode==='site'?config.site:''};
  }catch(err){
    record('connect-error',err.stack||err.message);
    removeView();activeOrigin='';activeMode='';
    try{await core.stop();}catch{}
    const error=err.message||String(err);send('error',{error});
    return {ok:false,error};
  }finally{busy=false;send('status',{status:view?'ready':'idle'});}
}
async function goHome(){
  if(busy||quitting)return {ok:false,error:'正在连接，请稍候'};
  busy=true;
  try{
    removeView();activeOrigin='';activeMode='';rejectedOrigins.clear();
    send('home');
    await core?.stop();
    return {ok:true};
  }catch(err){record('home-error',err.message);send('error',{error:err.message});return {ok:false,error:err.message};}
  finally{busy=false;send('status',{status:'idle'});}
}
async function reload(){if(view&&!view.webContents.isDestroyed()){view.webContents.reload();return {ok:true};}return {ok:false};}
async function quit(){
  if(quitting)return;
  quitting=true;
  try{await core?.stop();saveConfig();}catch(err){record('quit',err.message);}
  removeView();if(tray){tray.destroy();tray=null;}
  if(win&&!win.isDestroyed())win.destroy();app.quit();
}
function guard(event){if(!win||win.isDestroyed()||event.sender.id!==win.webContents.id)throw Error('Unauthorized desktop action');}
function ipc(name,handler){ipcMain.handle('desktop:'+name,async(event,...args)=>{guard(event);return handler(...args);});}
ipc('get',()=>state());
ipc('connect',args=>connect(args));
ipc('home',()=>confirmHome());
ipc('disconnect',()=>goHome());
ipc('reload',()=>reload());
ipc('open-log',()=>shell.openPath(logDir));
ipc('remove-recent-site',site=>{
  const next=forgetSite(config.recentSites,site);
  config.recentSites=next;
  if(!next.includes(config.site))config.site=next[0]||'';
  saveConfig();return {recentSites:[...next]};
});
ipc('open-external',url=>{const safe=safeExternalUrl(url);if(!safe)throw Error('只允许打开 HTTPS 地址');return shell.openExternal(safe);});
ipc('preferences',values=>{
  if(!values||typeof values!=='object')throw Error('设置无效');
  if('language'in values&&['zh','en'].includes(values.language))config.language=values.language;
  if('theme'in values&&['light','dark'].includes(values.theme))config.theme=values.theme;
  if('minimizeToTray'in values&&typeof values.minimizeToTray==='boolean')config.minimizeToTray=values.minimizeToTray;
  if('allowSiteRedirects'in values&&typeof values.allowSiteRedirects==='boolean')config.allowSiteRedirects=values.allowSiteRedirects;
  if('mode'in values&&['site','local','link'].includes(values.mode))config.mode=values.mode;
  if('site'in values&&typeof values.site==='string')config.site=values.site.slice(0,2048);
  saveConfig();return state();
});
ipc('quit',()=>quit());

app.on('activate',()=>{if(win&&!win.isDestroyed()){win.show();win.focus();}});
app.on('window-all-closed',()=>{if(process.platform!=='darwin'&&!config?.minimizeToTray)void quit();});
if(!app.requestSingleInstanceLock())app.quit();
else{
  app.on('second-instance',()=>{win?.show();win?.focus();});
  app.whenReady().then(()=>{
    const dir=app.getPath('userData');fs.mkdirSync(dir,{recursive:true});
    prefsFile=path.join(dir,'desktop-config.json');config=loadConfig();
    logDir=path.join(dir,'logs');fs.mkdirSync(logDir,{recursive:true});
    logFile=path.join(logDir,'desktop.log');
    const root=app.isPackaged?path.join(process.resourcesPath,'piik'):path.join(__dirname,'../vendor/piik');
    coreExe=findCoreExecutable(root);
    if(coreExe){
      const upstreamLogs=path.join(logDir,'upstream');fs.mkdirSync(upstreamLogs,{recursive:true});
      core=new PiikSupervisor({exe:coreExe,log:record,logDir:upstreamLogs,configDir:dir});
      core.on('crash',({code})=>{
        if(quitting)return;
        record('core-crash',code);
        removeView();activeOrigin='';activeMode='';
        send('error',{error:`Piik Core 意外退出（${code}），已返回首页。`});send('home');
      });
    }
    makeRemoteSession();createWindow();createTray();
    record('desktop-start',`v${app.getVersion()} core ${coreExe?'found':'missing'}`);
  }).catch(err=>{console.error(err);void dialog.showMessageBox({type:'error',message:'Piik Desktop 启动失败',detail:err.message});app.quit();});
}

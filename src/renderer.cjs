'use strict';
const api=window.piikDesktop;
const $=id=>document.getElementById(id);
const TEXT={
  zh:{tagline:'隐藏成就：有人懂你的快乐。',open:'打开 Piik',local:'本地房间',localNote:'同一局域网内使用',
    public:'公网邀请',publicNote:'生成一个临时公网邀请链接',site:'连接站点',siteNote:'使用已有的 Piik 站点',
    enter:'进入 Piik',credit:'Raqtpie & Piik community · MIT 开源',upstreamCredit:'基于 TNTcraft 与贡献者开发的 Piik',official:'Piik 官网 ↗',github:'桌面端源码 ↗',
    home:'首页',refresh:'刷新',logs:'日志',settings:'桌面设置',tray:'关闭窗口时最小化到托盘',done:'完成',
    settingNote:'分享、音频和房间功能仍由上游 Piik 负责。',light:'亮色',dark:'暗色',
    starting:'正在连接 Piik，请稍候…',loadingSite:'正在打开 Piik…',loadingHint:'连接就绪后将自动进入。',missing:'未找到上游 Piik App，请先执行 npm run upstream:prepare。',
    input:'请填写 Piik 站点地址。',stop:'返回首页将断开当前房间或正在进行的分享，是否继续？',
    connected:'已连接',cancelled:'已取消连接。',connectError:'连接失败：',publicMode:'公网邀请',localMode:'本地房间',recent:'最近使用',removeRecent:'删除这条记录',allowRedirects:'允许网站自动跳转',redirectHint:'网站地址或端口变化时，直接继续连接。只建议用于你信任的网站。'},
  en:{tagline:'Hidden achievement: someone gets your joy.',open:'Open Piik',local:'Local Room',localNote:'Use on the same LAN',
    public:'Public Invite',publicNote:'Create a temporary public invitation',site:'Connect to Site',siteNote:'Connect to an existing Piik site',
    enter:'Enter Piik',credit:'Raqtpie & Piik community · MIT licensed',upstreamCredit:'Powered by Piik, by TNTcraft and contributors',official:'Piik Website ↗',github:'Desktop Source ↗',
    home:'Home',refresh:'Refresh',logs:'Logs',settings:'Desktop Settings',tray:'Minimize to tray when closing the window',done:'Done',
    settingNote:'Sharing, audio and room features remain provided by upstream Piik.',light:'Light',dark:'Dark',
    starting:'Connecting to Piik…',loadingSite:'Opening Piik…',loadingHint:'Your room will open when the connection is ready.',missing:'Upstream Piik App not found. Run npm run upstream:prepare first.',
    input:'Enter a Piik site URL.',stop:'Returning home will disconnect your current room or stream. Continue?',
    connected:'Connected',cancelled:'Connection cancelled.',connectError:'Connection failed: ',publicMode:'Public Invite',localMode:'Local Room',recent:'Recently used',removeRecent:'Remove this site',allowRedirects:'Allow website redirects',redirectHint:'If the site changes its address or port, continue automatically. Only use this for websites you trust.'}
};
let mode='site',lang='zh',theme='light',busy=false,connected=false,recentSites=[],minimizeToTray=false,allowRedirects=false;
function t(key){return TEXT[lang][key]||key;}
function banner(text='',error=false){$('banner').hidden=!text;$('banner').className='message '+(error?'error':'info');$('banner').textContent=text;}
function updateRecentSites(){
  const box=$('recentSites');
  box.replaceChildren();
  box.hidden=mode!=='site'||!!$('siteInput').value.trim()||recentSites.length===0;
  if(box.hidden)return;
  const label=document.createElement('span');label.className='recent-sites-label';label.textContent=t('recent')+'：';box.appendChild(label);
  for(const site of recentSites){
    const item=document.createElement('span');item.className='recent-site-item';
    const use=document.createElement('button');use.type='button';use.className='recent-site-use';use.textContent=site;use.title=site;
    use.addEventListener('click',()=>{$('siteInput').value=site;updateRecentSites();$('siteInput').focus();});
    const del=document.createElement('button');del.type='button';del.className='recent-site-delete';del.textContent='×';del.title=t('removeRecent');del.setAttribute('aria-label',t('removeRecent')+' '+site);
    del.addEventListener('click',async()=>{
      if(busy)return;
      del.disabled=true;
      try{const result=await api.removeRecentSite(site);recentSites=result.recentSites||[];updateRecentSites();}
      catch(err){banner(err.message,true);del.disabled=false;}
    });
    item.append(use,del);box.appendChild(item);
  }
}
function setMode(value){
  if(busy)return;
  mode=value;
  for(const el of document.querySelectorAll('.mode-card')){
    const active=el.dataset.mode===value;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));
  }
  $('siteField').hidden=value!=='site';
  $('redirectOption').hidden=value!=='site';
  updateRecentSites();
  void api.preferences({mode:value});
  banner('');
}
function setLanguage(value){
  lang=value==='en'?'en':'zh';document.documentElement.lang=lang==='zh'?'zh-CN':'en';
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
  $('themeLabel').textContent=t(theme==='light'?'dark':'light');
  $('zhBtn').classList.toggle('active',lang==='zh');$('enBtn').classList.toggle('active',lang==='en');
  $('zhBtn').setAttribute('aria-pressed',String(lang==='zh'));$('enBtn').setAttribute('aria-pressed',String(lang==='en'));
  updateRecentSites();
  void api.preferences({language:lang});
}
function setTheme(value){
  theme=value==='dark'?'dark':'light';document.body.dataset.theme=theme;
  $('themeLabel').textContent=t(theme==='light'?'dark':'light');
  void api.preferences({theme});
}
function showConnected(visible,origin='',currentMode='',loading=false){
  connected=visible;
  $('launcher').hidden=visible;$('toolbar').hidden=!visible;
  $('loadingPanel').hidden=!loading;
  $('connectedLabel').textContent=currentMode==='local'?t('localMode'):currentMode==='link'?t('publicMode'):(origin||'Piik');
}
function setBusy(value){
  busy=value;
  $('connectBtn').disabled=value;
  $('allowRedirects').disabled=value;
  for(const el of document.querySelectorAll('.mode-card'))el.disabled=value;
  $('homeBtn').disabled=value;
}
async function start(){
  if(busy)return;
  if(mode==='site'&&!$('siteInput').value.trim()){banner(t('input'),true);$('siteInput').focus();return;}
  setBusy(true);banner(t('starting'));
  try{
    const response=await api.connect({mode,site:$('siteInput').value.trim(),allowRedirects});
    if(response.ok){
      if(mode==='site')recentSites=[response.savedSite||$('siteInput').value.trim(),...recentSites.filter(value=>value!==(response.savedSite||$('siteInput').value.trim()))].slice(0,5);updateRecentSites();showConnected(true,response.origin,response.mode);banner('');
    }else banner(response.cancelled?t('cancelled'):(t('connectError')+(response.error||'')),!response.cancelled);
  }catch(err){banner(t('connectError')+err.message,true);}
  finally{setBusy(false);}
}
async function home(){
  if(busy)return;
  setBusy(true);
  try{
    const response=await api.home();
    if(response.ok)showConnected(false);
    else if(!response.cancelled)banner(response.error||'Failed to return home',true);
  }catch(err){banner(err.message,true);}finally{setBusy(false);}
}
$('connectForm').addEventListener('submit',event=>{event.preventDefault();void start();});
$('siteInput').addEventListener('input',()=>{updateRecentSites();banner('');});
$('allowRedirects').addEventListener('change',()=>{
  allowRedirects=$('allowRedirects').checked;
  void api.preferences({allowSiteRedirects:allowRedirects});
});
for(const el of document.querySelectorAll('.mode-card'))el.addEventListener('click',()=>setMode(el.dataset.mode));
$('zhBtn').addEventListener('click',()=>setLanguage('zh'));
$('enBtn').addEventListener('click',()=>setLanguage('en'));
$('themeBtn').addEventListener('click',()=>setTheme(theme==='light'?'dark':'light'));
$('logoHome').addEventListener('click',()=>{if(connected)void home();});
$('homeBtn').addEventListener('click',()=>void home());
$('refreshBtn').addEventListener('click',()=>void api.reload());
$('toolbarLogsBtn').addEventListener('click',()=>void api.openLog());
$('settingsBtn').addEventListener('click',()=>{$('trayCheck').checked=minimizeToTray;$('settingsModal').hidden=false;});
$('settingsCloseBtn').addEventListener('click',async()=>{minimizeToTray=$('trayCheck').checked;await api.preferences({minimizeToTray});$('settingsModal').hidden=true;});
$('settingsLogsBtn').addEventListener('click',()=>void api.openLog());
$('settingsModal').addEventListener('click',event=>{if(event.target===$('settingsModal'))$('settingsModal').hidden=true;});
$('officialBtn').addEventListener('click',()=>void api.openExternal('https://piik.tv/'));
$('githubBtn').addEventListener('click',()=>void api.openExternal('https://github.com/Raqtpie/Piik-Desktop'));
api.onState(({type,status,error,message,mode:nextMode,origin})=>{
  if(type==='loading')showConnected(true,origin,nextMode,true);
  if(type==='home')showConnected(false);
  if(type==='connected')showConnected(true,origin,nextMode);
  if(type==='error'){showConnected(false);banner(error||'Unknown error',true);}
  if(type==='notice')banner(message);
  if(type==='status'&&status==='idle'&&!busy&&connected)showConnected(false);
});
(async()=>{
  try{
    const prefs=await api.get();
    $('version').textContent='v'+prefs.version;
    recentSites=Array.isArray(prefs.recentSites)?prefs.recentSites:[];minimizeToTray=!!prefs.minimizeToTray;
    allowRedirects=prefs.allowSiteRedirects===true;
    $('allowRedirects').checked=allowRedirects;
    $('siteInput').value=''; // Never pre-populate, even if a previous address was saved.
    updateRecentSites();
    setLanguage(prefs.language||'zh');setTheme(prefs.theme||'light');setMode(prefs.mode||'site');
    if(!prefs.hasCore)banner(t('missing'),true);
  }catch(err){banner(err.message,true);}
})();

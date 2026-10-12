'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(path.join(__dirname,'../src',file),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('loading keeps a complete toolbar and restores home after an error',async()=>{
 const dom=new JSDOM(read('index.html'),{runScripts:'outside-only',url:'http://localhost'});
 try{
  let receive;
  dom.window.piikDesktop={preferences:async()=>{},get:async()=>({version:'0.1.0',hasCore:true}),onState:fn=>receive=fn};
  dom.window.eval(read('renderer.cjs'));await settle();
  const d=dom.window.document;
  receive({type:'loading',mode:'site',origin:'https://piik.example'});
  assert.equal(d.querySelector('#launcher').hidden,true);
  assert.equal(d.querySelector('#toolbar').hidden,false);
  assert.equal(d.querySelector('#loadingPanel').hidden,false);
  assert.equal(d.querySelector('#connectedLabel').textContent,'https://piik.example');
  receive({type:'connected',mode:'site',origin:'https://piik.example'});
  assert.equal(d.querySelector('#loadingPanel').hidden,true);
  assert.equal(d.querySelector('#toolbar').hidden,false);
  receive({type:'loading',mode:'site',origin:'https://piik.example'});
  receive({type:'error',error:'Connection failed'});
  assert.equal(d.querySelector('#launcher').hidden,false);
  assert.equal(d.querySelector('#loadingPanel').hidden,true);
  assert.equal(d.querySelector('#banner').textContent,'Connection failed');
 }finally{dom.window.close();}
});
test('remote content is attached only after loading succeeds',async()=>{
 const source=read('main.cjs');
 const code=source.slice(source.indexOf('async function connect(args={})'),source.indexOf('async function goHome()'));
 let ready,fail;
 const loaded=new Promise((resolve,reject)=>{ready=resolve;fail=reject;});
 const events=[];
 const remote={webContents:{loadURL:()=>loaded}};
 const context={busy:false,quitting:false,core:{start:async()=>({}),stop:async()=>{}},config:{allowSiteRedirects:false},
  send:(type,data)=>events.push({type,data}),validateSite:value=>value,
  resolveSite:async value=>({origin:value,url:value+'/'}),withClientFragment:value=>value,
  removeView:()=>{context.view=null;},createRemoteView:()=>{context.view=remote;},
  saveConfig:()=>{},rejectedOrigins:new Set(),win:{contentView:{addChildView:view=>events.push({type:'attach',view})}},
  viewBounds:()=>{},rememberSite:()=>[],displayName:()=> 'Piik',record:()=>{},lastSite:'',activeOrigin:'',activeMode:''};
 vm.runInNewContext(code,context);
 const result=context.connect({mode:'site',site:'https://piik.example'});
 await settle();
 assert.equal(events.some(e=>e.type==='loading'),true);
 assert.equal(events.some(e=>e.type==='attach'),false);
 ready();assert.equal((await result).ok,true);
 assert.ok(events.findIndex(e=>e.type==='attach')>events.findIndex(e=>e.type==='loading'));
 assert.ok(events.findIndex(e=>e.type==='connected')>events.findIndex(e=>e.type==='attach'));
});

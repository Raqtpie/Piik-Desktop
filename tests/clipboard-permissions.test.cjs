'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function policy(){
 const code=fs.readFileSync(path.join(__dirname,'../src/main.cjs'),'utf8');
 const start=code.indexOf('function makeRemoteSession(){');
 const end=code.indexOf('async function confirmRedirect',start);
 const handlers={setPermissionCheckHandler(fn){this.check=fn;},setPermissionRequestHandler(fn){this.request=fn;},setDisplayMediaRequestHandler(){}};
 const wc={getURL:()=> 'https://piik.example/'};
 const context={session:{fromPartition:()=>handlers},REMOTE_PARTITION:'test',view:{webContents:wc},activeOrigin:'https://piik.example',mediaGrants:new Set(),nativeNetworkPermissions:new Set(['localNetworkAccess','local-network-access','local-network','loopback-network']),currentWebOrigin:value=>{try{return new URL(value).origin;}catch{return '';}}};
 vm.runInNewContext(code.slice(start,end)+'\nmakeRemoteSession();',context);
 return {handlers,wc,context};
}
test('current Piik page may copy text through both permission paths',()=>{
 const {handlers,wc}=policy();
 assert.equal(handlers.check(wc,'clipboard-sanitized-write','https://piik.example'),true);
 let result;handlers.request(wc,'clipboard-sanitized-write',value=>result=value,{requestingUrl:'https://piik.example/room'});
 assert.equal(result,true);
});
test('clipboard reads, other origins and other windows remain denied',()=>{
 const {handlers,wc,context}=policy();
 for(const permission of ['clipboard-read','deprecated-sync-clipboard-read']){
  assert.equal(handlers.check(wc,permission,'https://piik.example'),false);
  let result;handlers.request(wc,permission,value=>result=value,{requestingUrl:'https://piik.example/'});assert.equal(result,false);
 }
 for(const [sender,url] of [[wc,'https://other.example'],[{getURL:wc.getURL},'https://piik.example']]){
  assert.equal(handlers.check(sender,'clipboard-sanitized-write',url),false);
  let result;handlers.request(sender,'clipboard-sanitized-write',value=>result=value,{requestingUrl:url});assert.equal(result,false);
 }
 context.view=null;
 assert.equal(handlers.check(wc,'clipboard-sanitized-write','https://piik.example'),false);
});

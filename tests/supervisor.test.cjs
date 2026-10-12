const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseReadyLine,findCoreExecutable,lanAddressChoices}=require('../src/supervisor.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('LAN failure offers only validated addresses from upstream error',()=>{
 assert.deepEqual(lanAddressChoices('multiple LAN addresses are active; restart with --local --lan-address <address>, choosing from: 10.8.0.2, 192.168.31.32; public-link mode does not require this selection'),['10.8.0.2','192.168.31.32']);
 assert.deepEqual(lanAddressChoices('unrelated failure 192.168.31.32'),[]);
 assert.deepEqual(lanAddressChoices('multiple LAN addresses are active; choosing from: 999.1.1.1, 10.0.0.1, 10.0.0.1;'),['10.0.0.1']);
});
test('parses official Piik loopback endpoint format',()=>{
  const token='abcdefghijklmnopqrstuvwxyz-ABCDEF123456789';
  const payload=JSON.stringify({url:'http://127.0.0.1:39721',host:'127.0.0.1:39721',port:39721,instanceToken:token});
  assert.deepEqual(parseReadyLine(payload),{port:39721,host:'127.0.0.1:39721',url:'http://127.0.0.1:39721/health'});
});
test('rejects malformed or non-loopback endpoint',()=>{
  for(const text of ['not json','{}',JSON.stringify({host:'8.8.8.8:39721',port:39721,instanceToken:'aaaaaaaaaaaa'}),JSON.stringify({host:'127.0.0.1:80',port:80,instanceToken:'aaaaaaaaaaaa'})])assert.equal(parseReadyLine(text),null);
});
test('finds upstream exe in nested official zip',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'piik-test-'));
  try{
    fs.mkdirSync(path.join(dir,'app'));fs.writeFileSync(path.join(dir,'app','piik-app.exe'),'fake');
    assert.equal(findCoreExecutable(dir,'win32'),path.join(dir,'app','piik-app.exe'));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

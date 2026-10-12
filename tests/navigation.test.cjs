'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {allowedOrigin,displayName,mayAutoFollowAtConnect}=require('../src/navigation.cjs');
test('allow only same-origin HTTP(S) without URL credentials',()=>{
  assert.equal(allowedOrigin('https://piik.example/room/123','https://piik.example'),true);
  assert.equal(allowedOrigin('https://piik.example:443/','https://piik.example'),true);
  assert.equal(allowedOrigin('https://piik.example:9281','https://piik.example'),false);
  assert.equal(allowedOrigin('http://piik.example/','https://piik.example'),false);
  assert.equal(allowedOrigin('javascript:alert(1)','https://piik.example'),false);
  assert.equal(allowedOrigin('https://user:pass@piik.example/','https://piik.example'),false);
  assert.equal(allowedOrigin('https://piik.example/',''),false);
});
test('mode labels do not carry provider-specific networking terms',()=>{
  assert.equal(displayName('local',''),'Local room');
  assert.equal(displayName('link',''),'Public invitation');
  assert.equal(displayName('site','https://piik.example:4443'),'piik.example:4443');
});

test('website redirect switch is explicit and limited to safe initial HTTPS changes',()=>{
  assert.equal(mayAutoFollowAtConnect('https://piik.example','https://next.example:9265',false),false);
  assert.equal(mayAutoFollowAtConnect('https://piik.example','https://next.example:9265',true),true);
  assert.equal(mayAutoFollowAtConnect('https://piik.example','http://next.example',true),false);
  assert.equal(mayAutoFollowAtConnect('http://127.0.0.1:8787','https://next.example',true),false);
  assert.equal(mayAutoFollowAtConnect('https://piik.example','https://127.0.0.1:8787',true),false);
  assert.equal(mayAutoFollowAtConnect('https://piik.example','file:///etc/passwd',true),false);
  assert.equal(mayAutoFollowAtConnect('https://piik.example','https://user:pass@next.example',true),false);
});

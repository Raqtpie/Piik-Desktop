const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateSite,withClientFragment,resolveSite,safeExternalUrl}=require('../src/security.cjs');
test('site root normalization',()=>{
  assert.equal(validateSite('piik.example'),'https://piik.example');
  assert.equal(validateSite('https://redirect.example:9265/'),'https://redirect.example:9265');
  assert.equal(validateSite('http://localhost:8787'),'http://localhost:8787');
});
test('unsafe and malformed sites are rejected',()=>{
  for(const value of ['file:///etc/passwd','http://public.test','https://u:p@site.com/','https://site.com/room','https://site.com/?token=1','https://site.com/#foo','javascript:alert(1)']){
    assert.throws(()=>validateSite(value),undefined,value);
  }
});
test('launch marker retains existing fragment',()=>{
  assert.match(withClientFragment('https://piik.example/#foo=1'),/#foo=1&piik-client=1$/);
  assert.throws(()=>withClientFragment('file:///tmp/foo'));
});
test('resolves dynamic HTTPS cross-port redirect for exact Go origin',async()=>{
  const response={url:'https://redirect.example:9265/', body:null};
  const fakeFetch=async(input,options)=>{assert.equal(options.method,'HEAD');return response;};
  const data=await resolveSite('https://piik.example',fakeFetch);
  assert.equal(data.inputOrigin,'https://piik.example');
  assert.equal(data.origin,'https://redirect.example:9265');
});
test('no script or file URL may open externally',()=>{
  assert.equal(safeExternalUrl('https://piik.tv/docs/zh/'),'https://piik.tv/docs/zh/');
  assert.equal(safeExternalUrl('http://piik.tv/'),null);
  assert.equal(safeExternalUrl('javascript:alert(1)'),null);
});

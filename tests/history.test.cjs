'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {normalizeHistory,rememberSite,forgetSite,LIMIT}=require('../src/history.cjs');
test('first launch has no history; migrate old site without duplicates',()=>{
  assert.deepEqual(normalizeHistory([],''),[]);
  assert.deepEqual(normalizeHistory(['https://a.example','https://a.example'], 'https://b.example'), ['https://a.example','https://b.example']);
});
test('history keeps 5 newest unique validated HTTPS or local URLs',()=>{
  let sites=[];
  for(let i=0;i<7;i++)sites=rememberSite(sites,`https://piik${i}.example`);
  assert.equal(sites.length,LIMIT);assert.equal(sites[0],'https://piik6.example');
  assert.equal(rememberSite(sites,'https://piik4.example')[0],'https://piik4.example');
  assert.deepEqual(normalizeHistory(['javascript:alert(1)','http://malicious.example','https://valid.example']),['https://valid.example']);
});
test('delete exactly one record; no mutation of source array',()=>{
  const input=['https://a.example','https://b.example'];
  assert.deepEqual(forgetSite(input,'https://a.example'),['https://b.example']);
  assert.equal(input.length,2);
});

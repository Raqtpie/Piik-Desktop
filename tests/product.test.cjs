'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
test('independent home has all three original Piik launcher choices',()=>{
  const html=source('src/index.html');
  for(const value of ['data-mode="site"','data-mode="local"','data-mode="link"','id="siteInput"','id="connectBtn"'])assert.ok(html.includes(value),value);
});
test('no private site preset, STUN provider, or upstream Go source patch in runtime',()=>{
  const files=['src/main.cjs','src/renderer.cjs','src/index.html','src/supervisor.cjs','scripts/prepare-upstream.cjs'];
  const text=files.map(source).join('\n');
  for(const needle of ['Lucky','STUN_Piik','replaceOnce(','internal/app/app.go','--desktop-launcher'])assert.ok(!text.includes(needle),`found ${needle}`);
});
test('connected toolbar provides home, refresh and diagnostics without a second share UI',()=>{
  const html=source('src/index.html');
  assert.match(html,/id="homeBtn"/);assert.match(html,/id="refreshBtn"/);assert.match(html,/id="toolbarLogsBtn"/);assert.doesNotMatch(html,/id="previewBtn"/);
  assert.ok(!html.includes('开始分享'));
});
test('Go App always starts in upstream no-browser explicit mode',()=>{
  const s=source('src/supervisor.cjs');
  assert.ok(s.includes('PIIK_CLIENT_GATE_NO_BROWSER'));
  for(const flag of ['--site=','--local','--link'])assert.ok(s.includes(flag));
});
test('packaging script downloads official release and verifies exact SHA256',()=>{
  const s=source('scripts/prepare-upstream.cjs');
  assert.match(s,/const RELEASE = 'v1\.9\.2'/);assert.ok(s.includes('actual!==expected'));
  assert.ok(!s.includes('build-bridge'));
});

test('launcher includes a readable opt-in website redirect control',()=>{
  const html=source('src/index.html');
  assert.ok(html.includes('id="allowRedirects" type="checkbox"'));
  assert.ok(html.includes('允许网站自动跳转'));
  const main=source('src/main.cjs');
  assert.ok(main.includes('allowSiteRedirects:false'));
  assert.ok(main.includes('mayAutoFollowAtConnect'));
  assert.ok(main.includes('runtimeNavigation(target)')); // Later navigation still asks.
});

'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('launcher logo shares one intrinsic ratio and is not stretched',()=>{
 const html=read('src/index.html'),css=read('src/style.css');
 assert.equal((html.match(/src="piik-mark.svg"/g)||[]).length,3);
 assert.match(read('src/piik-mark.svg'),/viewBox="0 0 32 32"/);
 assert.match(css,/object-fit:contain/);assert.doesNotMatch(css,/\.robot\{[^}]*aspect-ratio:1\/1/);
});
test('desktop browser removal has no preference switch',()=>{
 const main=read('src/main.cjs'),adapter=read('src/picker-adapter.cjs');
 assert.match(main,/executeJavaScriptInIsolatedWorld/);
 assert.doesNotMatch(read('src/index.html'),/hideBrowserCheck/);
 assert.match(adapter,/MutationObserver/);
 assert.match(adapter,/data-source-tab="browser"/);
});
test('media permissions are checked, remembered per room and cleared on leaving',()=>{
 const main=read('src/main.cjs');
 assert.match(main,/setPermissionCheckHandler/);
 assert.match(main,/mediaGrants\.has\(origin\)/);
 assert.match(main,/mediaGrants\.clear\(\)/);
 assert.match(main,/activeOrigin===origin/);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {browserTabVisibilityScript}=require('../src/picker-adapter.cjs');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const dom=new JSDOM('<button id="unrelated">Browser</button><div class="lr-source-picker"><div role="tablist">'+
 ['browser','camera','window','display'].map(tab=>`<span class="lr-comic-tip-wrap"><button role="tab" data-source-tab="${tab}" aria-selected="${tab==='browser'}">${tab}</button><span popover="manual" role="tooltip">help</span></span>`).join('')+'</div></div>',{runScripts:'outside-only'});
 const {document}=dom.window;
 const tabs=[...document.querySelectorAll('[role="tab"]')];
 for(const tab of tabs)tab.addEventListener('click',()=>{for(const item of tabs)item.setAttribute('aria-selected',String(item===tab));});
 dom.window.eval(browserTabVisibilityScript());
 return dom;
}
test('hides browser and its wrapper, selects window, preserves unrelated buttons',async()=>{
 const dom=fixture();try{
  await settle();const d=dom.window.document;
  assert.equal(d.querySelector('[data-source-tab="browser"]').hidden,true);
  assert.equal(d.querySelector('[data-source-tab="browser"]').parentElement.style.display,'none');
  assert.equal(d.querySelector('[data-source-tab="browser"]').parentElement.querySelector('[popover]').style.display,'none');
  assert.equal(d.querySelector('[data-source-tab="window"]').getAttribute('aria-selected'),'true');
  assert.equal(d.querySelector('[role="tablist"]').style.gridTemplateColumns,'repeat(3, minmax(0, 1fr))');
  assert.equal(d.querySelector('#unrelated').hidden,false);
  // React can rewrite inline layout when native source discovery completes.
  d.querySelector('[role="tablist"]').style.gridTemplateColumns='repeat(4, minmax(0, 1fr))';
  await settle();
  assert.equal(d.querySelector('[role="tablist"]').style.gridTemplateColumns,'repeat(3, minmax(0, 1fr))');
 }finally{dom.window.__piikDesktopBrowserTabObserver?.disconnect();await settle();dom.window.close();}
});
test('keyboard navigation skips browser and repeated installation stays stable',async()=>{
 const dom=fixture();try{
  await settle();dom.window.eval(browserTabVisibilityScript());await settle();
  const d=dom.window.document,list=d.querySelector('[role="tablist"]');
  list.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Home',bubbles:true}));await settle();
  assert.equal(d.querySelector('[data-source-tab="camera"]').getAttribute('aria-selected'),'true');
  list.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));await settle();
  assert.equal(d.querySelector('[data-source-tab="display"]').getAttribute('aria-selected'),'true');
  const browser=d.querySelector('[data-source-tab="browser"]');browser.click();await settle();
  assert.equal(browser.getAttribute('aria-selected'),'false');
 }finally{dom.window.__piikDesktopBrowserTabObserver?.disconnect();await settle();dom.window.close();}
});
test('observer adapts source pickers opened after page load',async()=>{
 const dom=new JSDOM('<main></main>',{runScripts:'outside-only'});try{
  dom.window.eval(browserTabVisibilityScript());
  dom.window.document.querySelector('main').innerHTML='<div class="lr-source-picker"><div role="tablist"><button data-source-tab="browser"></button><button data-source-tab="camera"></button></div></div>';
  await settle();assert.equal(dom.window.document.querySelector('[data-source-tab="browser"]').hidden,true);
 }finally{dom.window.__piikDesktopBrowserTabObserver?.disconnect();await settle();dom.window.close();}
});
test('discovery does not activate camera before native tabs arrive',async()=>{
 const dom=new JSDOM('<div class="lr-source-picker"><div role="tablist"><button data-source-tab="browser" aria-selected="true"></button><button data-source-tab="camera"></button></div><button class="lr-source-option is-browser"></button></div>',{runScripts:'outside-only'});
 try{
  let cameraClicks=0;dom.window.document.querySelector('[data-source-tab="camera"]').addEventListener('click',()=>cameraClicks++);
  dom.window.eval(browserTabVisibilityScript());await settle();
  assert.equal(cameraClicks,0);
  assert.equal(dom.window.document.querySelector('.is-browser').style.display,'none');
 }finally{dom.window.__piikDesktopBrowserTabObserver?.disconnect();await settle();dom.window.close();}
});

'use strict';
/* Fetches a pinned, checksummed official Piik App release for the host platform.
 * This script runs on developer's machine or GitHub Actions, not during app startup.
 * Desktop locks one core version with a matching in-repo Browser UI under vendor/frontend.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const https = require('node:https');
const crypto = require('node:crypto');
const {pipeline} = require('node:stream/promises');
const {extract} = require('@electron-internal/extract-zip');
const {execFileSync}=require('node:child_process');

const RELEASE = 'v2.1.0';
const RELEASES = {
  'win32-x64': ['piik-app-windows-amd64.zip','44fbccc7df301dc22a4b5c2dae9bedd82c3df519debcd5c65b0375f4d41745c8'],
  'darwin-x64': ['piik-app-darwin-amd64.zip','aaa950072909b5344bbc6616c1402dc917b9006ac4191639896f34b5b9ec588b'],
  'darwin-arm64': ['piik-app-darwin-arm64.zip','cd3052357fe50c081e4e3155b38c08f0833090953befa9b7045040cadab0433c']
};
function download(url, target, hops=0) {
  if(hops>6)return Promise.reject(Error('Too many download redirects'));
  return new Promise((resolve,reject)=>{
    const request=https.get(url,{headers:{'User-Agent':'Piik-Desktop-community-builder','Accept':'application/octet-stream'}},response=>{
      if([301,302,303,307,308].includes(response.statusCode)){
        response.resume();
        const next=new URL(response.headers.location,url);
        if(next.protocol!=='https:')return reject(Error('Refusing insecure download redirect'));
        download(next.toString(),target,hops+1).then(resolve,reject);return;
      }
      if(response.statusCode!==200){response.resume();reject(Error('Download failed: HTTP '+response.statusCode));return;}
      const file=fs.createWriteStream(target,{mode:0o600});
      pipeline(response,file).then(resolve,reject);
    });
    request.setTimeout(120000,()=>request.destroy(Error('Download timeout')));
    request.on('error',reject);
  });
}
function sha256(pathname) {
  return new Promise((resolve,reject)=>{
    const hash=crypto.createHash('sha256');const reader=fs.createReadStream(pathname);
    reader.on('data',chunk=>hash.update(chunk));reader.on('end',()=>resolve(hash.digest('hex')));reader.on('error',reject);
  });
}

function assertFrontendLock() {
  const manifestPath=path.resolve(__dirname,'../vendor/frontend/MANIFEST.json');
  if(!fs.existsSync(manifestPath)){
    throw Error('Missing vendor/frontend lock. Run npm run frontend:sync after bumping RELEASE.');
  }
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(manifest.piikRelease!==RELEASE){
    throw Error(`vendor/frontend is locked to ${manifest.piikRelease}, but core pin is ${RELEASE}. Refresh with npm run frontend:sync.`);
  }
  for(const file of manifest.files||[]){
    const full=path.resolve(__dirname,'../vendor/frontend',file.path);
    if(!fs.existsSync(full))throw Error('Missing vendored frontend file: '+file.path);
    const actual=crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
    if(actual!==file.sha256)throw Error('Vendored frontend checksum mismatch: '+file.path);
  }
  return manifest;
}

async function main() {
  const frontend=assertFrontendLock();
  console.log(`Frontend lock OK: ${frontend.piikRelease} (${frontend.signalingProtocol||'protocol n/a'})`);
  const key=process.platform+'-'+process.arch;
  const spec=RELEASES[key];
  if(!spec) throw Error(`Unsupported build target: ${key}; use Windows x64 or macOS x64/arm64.`);
  const [filename,expected]=spec;
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'piik-desktop-'));
  const zipFile=path.join(folder,filename);
  const target=path.resolve(__dirname,'../vendor/piik');
  const url=`https://github.com/TNTcraftHIM/Piik/releases/download/${RELEASE}/${filename}`;
  try {
    console.log('Downloading official upstream:',url);
    await download(url,zipFile);
    const actual=await sha256(zipFile);
    if(actual!==expected)throw Error(`SHA-256 checksum mismatch: expected ${expected}, got ${actual}`);
    fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(target,{recursive:true});
    await extract(zipFile,{dir:target});
    const {findCoreExecutable}=require('../src/supervisor.cjs');
    const executable=findCoreExecutable(target);
    if(!executable)throw Error('Archive does not contain piik-app executable');
    if(process.platform!=='win32')fs.chmodSync(executable,0o755);
    // Official macOS helper still lacks --preview. Keep Desktop's minimal native
    // patch so original source cards can use the existing Go preview protocol.
    // native/darwin is intentionally not rewritten during the 2.1.0 pin.
    if(process.platform==='darwin'){
      const nativeRoot=path.resolve(__dirname,'../native/darwin');
      const buildDir=path.join(folder,'capture-build');
      execFileSync('/bin/sh',[path.join(nativeRoot,'build.sh'),buildDir],{stdio:'inherit'});
      const helpers=[];
      function findHelpers(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
        const full=path.join(dir,entry.name);
        if(entry.isDirectory())findHelpers(full);
        else if(entry.name==='piik-capture')helpers.push(full);
      }}
      findHelpers(target);
      if(helpers.length!==1)throw Error('Expected exactly one macOS piik-capture helper');
      fs.copyFileSync(path.join(buildDir,'piik-capture'),helpers[0]);fs.chmodSync(helpers[0],0o755);
    }
    const readme=path.join(target,'DESKTOP-UPSTREAM-MANIFEST.txt');
    fs.writeFileSync(readme,`Original project: https://github.com/TNTcraftHIM/Piik\nVersion: ${RELEASE}\nAsset: ${filename}\nSHA-256: ${actual}\nFrontend lock: vendor/frontend (${frontend.piikRevision||'see MANIFEST.json'})\nSignaling: ${frontend.signalingProtocol||'see MANIFEST.json'}\n`,{mode:0o644});
    console.log('Upstream ready:',executable);
  } finally {fs.rmSync(folder,{recursive:true,force:true});}
}
if(require.main===module)main().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
module.exports={RELEASE,RELEASES,sha256,assertFrontendLock};

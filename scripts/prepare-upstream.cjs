'use strict';
/* Fetches a pinned, checksummed official Piik App release for the host platform.
 * This script runs on developer's machine or GitHub Actions, not during app startup.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const https = require('node:https');
const crypto = require('node:crypto');
const {pipeline} = require('node:stream/promises');
const {extract} = require('@electron-internal/extract-zip');
const {execFileSync}=require('node:child_process');

const RELEASE = 'v1.9.2';
const RELEASES = {
  'win32-x64': ['piik-app-windows-amd64.zip','e52b6ecea687b194f58cda88d2f2578389a82e8221c9deb794f37e6fddc690f7'],
  'darwin-x64': ['piik-app-darwin-amd64.zip','18b855ed5d39c275d051b7f9767970aa142736689ac0e574d326cb5093be726d'],
  'darwin-arm64': ['piik-app-darwin-arm64.zip','fa53b8ded1005261e2919a6979161827092d68c1929ece07d4de7bf9193ed642']
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
async function main() {
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
    // v1.9.2's macOS helper lacks --preview. Build the minimal native fix so
    // the original source cards can use the existing Go preview protocol.
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
    fs.writeFileSync(readme,`Original project: https://github.com/TNTcraftHIM/Piik\nVersion: ${RELEASE}\nAsset: ${filename}\nSHA-256: ${actual}\n`,{mode:0o644});
    console.log('Upstream ready:',executable);
  } finally {fs.rmSync(folder,{recursive:true,force:true});}
}
if(require.main===module)main().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
module.exports={RELEASE,RELEASES,sha256};

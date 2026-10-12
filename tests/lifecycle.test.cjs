'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {PiikSupervisor}=require('../src/supervisor.cjs');
const {spawn}=require('node:child_process');
for(const mode of ['site','local','link']){
  test(`core supervisor starts and exits cleanly in ${mode} mode`,async()=>{
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'piik-supervisor-'));
    const exe=process.execPath;
    const fixture=path.join(__dirname,'fixtures/fake-piik.cjs');
    const logs=[];
    const supervisor=new PiikSupervisor({exe,log:(type,message)=>logs.push([type,message]),logDir:dir,configDir:dir,
      spawnProcess:(executable,args,options)=>spawn(executable,[fixture,...args],options)});
    try {
      const result=await supervisor.start(mode,'https://piik.example');
      assert.ok(result.endpoint.port>=39721&&result.endpoint.port<=39730);
      assert.ok(supervisor.child);
      if(mode==='link') assert.equal(result.publicOrigin,'https://fake.trycloudflare.com');
      await supervisor.stop();
      assert.equal(supervisor.child,null);
    } finally {
      await supervisor.stop();
      fs.rmSync(dir,{recursive:true,force:true});
    }
  });
}

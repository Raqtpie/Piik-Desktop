'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { EventEmitter } = require('node:events');

function lanAddressChoices(stderr){
  const match=/multiple LAN addresses are active;[\s\S]*?choosing from: ([0-9., ]+);/.exec(stderr);
  if(!match)return [];
  return [...new Set(match[1].split(',').map(x=>x.trim()).filter(x=>
    /^\d{1,3}(\.\d{1,3}){3}$/.test(x)&&x.split('.').every(n=>Number(n)<=255)))].slice(0,12);
}

function findCoreExecutable(root, platform = process.platform) {
  if (process.env.PIIK_APP_PATH) {
    const full = path.resolve(process.env.PIIK_APP_PATH);
    if (!fs.existsSync(full)) throw Error(`PIIK_APP_PATH 不存在: ${full}`);
    return full;
  }
  if (!fs.existsSync(root)) return null;
  const expected = platform === 'win32' ? 'piik-app.exe' : 'piik-app';
  const queue = [{dir:root, depth:0}];
  while (queue.length) {
    const {dir,depth} = queue.shift();
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
      const full = path.join(dir, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === expected) return full;
      if (entry.isDirectory() && depth < 3 && !entry.isSymbolicLink()) queue.push({dir:full, depth:depth+1});
    }
  }
  return null;
}

function parseReadyLine(line) {
  let obj;
  try { obj = JSON.parse(line); } catch { return null; }
  if (!obj || typeof obj !== 'object' || !Number.isInteger(obj.port) || obj.port < 39721 || obj.port > 39730) return null;
  if (obj.host !== `127.0.0.1:${obj.port}` || typeof obj.instanceToken !== 'string' || obj.instanceToken.length < 8) return null;
  return {port: obj.port, host: obj.host, url: `http://127.0.0.1:${obj.port}/health`};
}

class PiikSupervisor extends EventEmitter {
  constructor({exe, log, logDir, configDir, spawnProcess=spawn}) {
    super();
    this.exe = exe;
    this.log = log;
    this.logDir = logDir;
    this.configDir = configDir;
    this.spawnProcess=spawnProcess;
    this.child = null;
    this.starting = null;
    this.stopping = null;
    this.currentMode = null;
    this.expectedExit = false;
  }
  async start(mode, site, lanAddress='') {
    await this.stop();
    const args = [];
    if (mode === 'site') args.push(`--site=${site}`);
    else if (mode === 'local') args.push('--local');
    else if (mode === 'link') args.push('--link');
    else throw Error('未知启动模式');
    if(mode==='local'&&lanAddress){
      if(!/^\d{1,3}(\.\d{1,3}){3}$/.test(lanAddress)||!lanAddress.split('.').every(n=>Number(n)<=255))throw Error('Invalid LAN address');
      args.push(`--lan-address=${lanAddress}`);
    }
    args.push('--debug', `--log-dir=${this.logDir}`);
    // An isolated App config avoids overwriting user's existing upstream installation.
    args.push(`--config=${path.join(this.configDir, 'core-config.json')}`);
    const child = this.spawnProcess(this.exe, args, {
      cwd: path.dirname(this.exe),
      windowsHide: true,
      stdio: ['pipe','pipe','pipe'],
      env: {...process.env, PIIK_CLIENT_GATE_NO_BROWSER:'true'}
    });
    this.child = child;
    this.currentMode = mode;
    this.expectedExit = false;
    this.emit('state', 'starting');
    let output = '';
    let startupStderr = '';
    let endpoint = null;
    let publicOrigin = null;
    let siteAnnounced = false;
    let localAnnounced = false;
    let settled = false;
    let resolveStart, rejectStart;
    const promise = new Promise((resolve,reject)=>{resolveStart=resolve;rejectStart=reject;});
    const timeout = setTimeout(() => fail(Error('Piik Core 启动超时（30秒），请查看日志')), 30000);
    const cleanup = () => {clearTimeout(timeout);};
    const fail = err => {
      if (settled) return;
      settled = true; cleanup(); rejectStart(err);
      this.emit('state', 'failed');
    };
    const ready = () => {
      if (settled || !endpoint) return;
      if (mode === 'site' && !siteAnnounced) return;
      if (mode === 'local' && !localAnnounced) return;
      if (mode === 'link' && !publicOrigin) return;
      settled = true; cleanup();
      this.emit('state', 'ready');
      resolveStart({endpoint, publicOrigin});
    };
    const append = (buffer, kind) => {
      // Log lines are bounded. Never write instance tokens or local access passwords to logs.
      const text = buffer.toString('utf8');
      if (kind === 'stderr') {startupStderr=(startupStderr+text).slice(-8192);this.log('core-stderr', text.slice(0, 2000));return;}
      output += text;
      if (output.length > 256000) output = output.slice(-8192);
      let end;
      while ((end = output.indexOf('\n')) !== -1) {
        const line = output.slice(0,end).trim(); output = output.slice(end+1);
        const parsed = parseReadyLine(line);
        if (parsed) {endpoint = parsed; ready(); continue;}
        if (line.startsWith('Piik Site: ')) {siteAnnounced=true;ready();continue;}
        if (line.startsWith('Public invitation origin: ')) { publicOrigin=line.slice(26).trim();ready();continue;}
        if (line.startsWith('LAN invitation origin: ')) {localAnnounced=true;ready();continue;}
        if (line.startsWith('Local access password:')) continue;
        if (line.startsWith('Local access:')) continue;
        // Always avoid recording unknown stdout values; upstream may print credentials.
      }
    };
    child.stdout.on('data', data=>append(data,'stdout'));
    child.stderr.on('data', data=>append(data,'stderr'));
    // Writes can fail asynchronously if Core exits between the stop check
    // and the shutdown byte. An EPIPE must not crash the desktop process.
    child.stdin.on('error',()=>{});
    child.on('error', err => fail(new Error('无法启动 Piik Core: '+err.message)));
    child.on('exit', (code,signal)=>{
      const wasExpected = this.expectedExit;
      if (this.child === child) this.child = null;
      const duringStart=!settled;
      if (duringStart){
        const error=Error('Piik Core 意外退出，代码: '+code);
        error.lanAddresses=lanAddressChoices(startupStderr);
        if(error.lanAddresses.length)error.message='检测到多个局域网地址，请选择房间使用的网络。';
        fail(error);
      }
      if (!wasExpected&&!duringStart) {
        this.emit('state','stopped');
        this.emit('crash', {code,signal});
      }
    });
    try {
      const result = await promise;
      // /health confirms the advertised endpoint really is serving.
      const response = await fetch(result.endpoint.url, {signal:AbortSignal.timeout(2500)});
      if (!response.ok) throw Error('Piik Core 健康检查失败');
      return result;
    } catch (error) {
      await this.stop();
      throw error;
    }
  }
  async stop() {
    if (this.stopping) return this.stopping;
    if (!this.child) return;
    const child = this.child;
    this.expectedExit = true;
    this.stopping = new Promise(resolve => {
      if (child.exitCode !== null || child.signalCode !== null) {resolve();return;}
      const timer = setTimeout(()=>{try{child.kill();}catch{}},4500);
      const finalize=()=>{clearTimeout(timer);resolve();};
      child.once('exit', finalize);
      child.once('error', finalize);
      try {child.stdin.write('q');} catch {try{child.kill();}catch{}}
    }).finally(()=>{
      if(this.child===child)this.child=null;
      this.stopping=null;
      this.emit('state','stopped');
    });
    return this.stopping;
  }
}
module.exports = {PiikSupervisor, findCoreExecutable, parseReadyLine,lanAddressChoices};

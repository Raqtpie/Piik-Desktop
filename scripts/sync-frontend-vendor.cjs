'use strict';
/* Refresh the in-repo Browser UI lock to match the pinned Piik core release.
 * Downloads the official Linux x64 runtime package (embeds the same Vite build
 * shipped with App/Server), serves it briefly, and copies static assets into
 * vendor/frontend. Does not run at app startup.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const https = require('node:https');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const {pipeline} = require('node:stream/promises');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'vendor', 'frontend');
const {RELEASE, RELEASES, sha256} = require('./prepare-upstream.cjs');

// Runtime package identity for the locked release (same UI as App embeds).
const FRONTEND_RUNTIME = {
  'v2.1.0': {
    filename: 'piik-9925486-runtime.tar.gz',
    sha256: '76535d09d08b8a512126f1650d8b22ce9c48e4dbdedea30e21df6249de11845c',
    revision: '9925486cec9910c0a76e47208b29b6f39942e096',
    signalingProtocol: 'piik-v24',
  },
};

function download(url, target, hops = 0) {
  if (hops > 6) return Promise.reject(Error('Too many download redirects'));
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'Piik-Desktop-community-builder',
        Accept: 'application/octet-stream',
      },
    }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume();
        const next = new URL(response.headers.location, url);
        if (next.protocol !== 'https:') return reject(Error('Refusing insecure download redirect'));
        download(next.toString(), target, hops + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(Error('Download failed: HTTP ' + response.statusCode));
        return;
      }
      const file = fs.createWriteStream(target, {mode: 0o600});
      pipeline(response, file).then(resolve, reject);
    });
    request.setTimeout(120000, () => request.destroy(Error('Download timeout')));
    request.on('error', reject);
  });
}

async function extractTarGz(archive, dir) {
  await new Promise((resolve, reject) => {
    const child = spawn('tar', ['-xzf', archive, '-C', dir], {stdio: 'inherit'});
    child.on('error', reject);
    child.on('exit', code => (code === 0 ? resolve() : reject(Error('tar failed: ' + code))));
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchText(url) {
  const response = await fetch(url, {signal: AbortSignal.timeout(15000)});
  if (!response.ok) throw Error('HTTP ' + response.status + ' for ' + url);
  return Buffer.from(await response.arrayBuffer());
}

function collectAssetNames(binaryPath) {
  const data = fs.readFileSync(binaryPath);
  const names = new Set();
  const re = /assets\/([A-Za-z0-9_.@-]+\.(?:js|css|svg|png|jpg|webp|woff2?|ttf))/g;
  let match;
  while ((match = re.exec(data.toString('latin1')))) names.add(match[1]);
  return [...names].sort();
}

async function crawl(base, outDir, seedPaths) {
  const queue = [...seedPaths];
  const seen = new Set();
  while (queue.length) {
    const pathname = queue.shift();
    if (seen.has(pathname)) continue;
    seen.add(pathname);
    if (pathname.startsWith('/api') || pathname.startsWith('/signal') || pathname.startsWith('/health')) continue;
    const dest = pathname === '/'
      ? path.join(outDir, 'index.html')
      : path.join(outDir, pathname.replace(/^\//, ''));
    fs.mkdirSync(path.dirname(dest), {recursive: true});
    let body;
    try {
      body = await fetchText(base + (pathname === '/' ? '/' : pathname));
    } catch (error) {
      if (pathname === '/' || pathname.startsWith('/assets/')) throw error;
      continue;
    }
    fs.writeFileSync(dest, body, {mode: 0o644});
    const text = body.toString('utf8');
    if (!/\.(js|css|html)$/.test(pathname) && pathname !== '/') continue;
    for (const hit of text.matchAll(/["'](\/assets\/[^"']+)["']/g)) {
      if (!seen.has(hit[1])) queue.push(hit[1]);
    }
    for (const hit of text.matchAll(/["'](\.\/[A-Za-z0-9_.@-]+\.(?:js|css))["']/g)) {
      const currentDir = path.posix.dirname(pathname === '/' ? '/index.html' : pathname);
      const resolved = path.posix.normalize(path.posix.join(currentDir, hit[1]));
      if (!seen.has(resolved)) queue.push(resolved);
    }
    for (const hit of text.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) {
      const ref = hit[1];
      if (ref.startsWith('data:') || /^https?:/i.test(ref)) continue;
      const currentDir = path.posix.dirname(pathname === '/' ? '/index.html' : pathname);
      const resolved = ref.startsWith('/')
        ? ref
        : path.posix.normalize(path.posix.join(currentDir, ref));
      if (!seen.has(resolved)) queue.push(resolved);
    }
  }
}

function writeManifest({release, revision, signalingProtocol, runtimeAsset, runtimeSha256, outDir}) {
  const files = [];
  function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const rel = prefix ? prefix + '/' + entry.name : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, rel);
      else if (entry.isFile() && entry.name !== 'MANIFEST.json' && entry.name !== 'README.md') {
        const body = fs.readFileSync(full);
        files.push({
          path: rel.replace(/\\/g, '/'),
          bytes: body.length,
          sha256: crypto.createHash('sha256').update(body).digest('hex'),
        });
      }
    }
  }
  walk(outDir);
  files.sort((a, b) => a.path.localeCompare(b.path));
  const manifest = {
    name: 'piik-frontend',
    piikRelease: release,
    piikRevision: revision,
    signalingProtocol,
    source: {
      project: 'https://github.com/TNTcraftHIM/Piik',
      tag: release,
      runtimeAsset,
      runtimeSha256,
      extraction: 'Served static Browser UI from the matching piik-server package (embedded Vite dist).',
    },
    compatibility: {
      appAndSiteMustMatch: true,
      incompatibleWith: ['1.x'],
      notes: 'Piik 2.0.0 broke SignalingProtocol piik-v23→piik-v24 and quality-settings shape. App + Site must upgrade together. v2.1.0 stays on piik-v24 / 2.x DB lineage (compatible with 2.0.x; still incompatible with 1.x).',
    },
    files,
  };
  fs.writeFileSync(path.join(outDir, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n', {mode: 0o644});
}

function assertFrontendMatchesCore() {
  const manifestPath = path.join(TARGET, 'MANIFEST.json');
  if (!fs.existsSync(manifestPath)) {
    throw Error('Missing vendor/frontend/MANIFEST.json; run npm run frontend:sync');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.piikRelease !== RELEASE) {
    throw Error(`Frontend lock ${manifest.piikRelease} does not match core pin ${RELEASE}`);
  }
  for (const file of manifest.files || []) {
    const full = path.join(TARGET, file.path);
    if (!fs.existsSync(full)) throw Error('Missing vendored file: ' + file.path);
    const actual = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
    if (actual !== file.sha256) throw Error('Checksum mismatch for ' + file.path);
  }
  return manifest;
}

async function main() {
  const spec = FRONTEND_RUNTIME[RELEASE];
  if (!spec) throw Error(`No frontend runtime mapping for core pin ${RELEASE}`);
  // Keep RELEASES referenced so prepare + sync stay one release family.
  if (!RELEASES['win32-x64'] && !RELEASES['darwin-arm64'] && !RELEASES['darwin-x64']) {
    throw Error('prepare-upstream RELEASES is empty');
  }
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'piik-frontend-'));
  const archive = path.join(folder, spec.filename);
  const extractDir = path.join(folder, 'extract');
  const staging = path.join(folder, 'staging');
  fs.mkdirSync(extractDir, {recursive: true});
  fs.mkdirSync(staging, {recursive: true});
  const url = `https://github.com/TNTcraftHIM/Piik/releases/download/${RELEASE}/${spec.filename}`;
  let child;
  try {
    console.log('Downloading frontend runtime:', url);
    await download(url, archive);
    const actual = await sha256(archive);
    if (actual !== spec.sha256) throw Error(`Runtime SHA-256 mismatch: expected ${spec.sha256}, got ${actual}`);
    await extractTarGz(archive, extractDir);
    const server = path.join(extractDir, 'piik-server');
    if (!fs.existsSync(server)) throw Error('Runtime archive missing piik-server');
    fs.chmodSync(server, 0o755);
    const assetNames = collectAssetNames(server);
    if (!assetNames.length) throw Error('Could not discover embedded asset names');
    const port = 18787;
    child = spawn(server, [], {
      cwd: extractDir,
      env: {...process.env, LISTEN_HOST: '127.0.0.1', PORT: String(port)},
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let ready = false;
    const onData = chunk => {
      if (String(chunk).includes('Piik server is listening')) ready = true;
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    for (let i = 0; i < 50 && !ready && child.exitCode === null; i++) await sleep(100);
    if (!ready) throw Error('piik-server failed to become ready');
    const base = `http://127.0.0.1:${port}`;
    const seeds = ['/', '/favicon.svg', '/third-party-licenses.txt', ...assetNames.map(name => '/assets/' + name)];
    await crawl(base, staging, seeds);
    if (!fs.existsSync(path.join(staging, 'index.html'))) throw Error('Frontend crawl missing index.html');
    fs.rmSync(TARGET, {recursive: true, force: true});
    fs.mkdirSync(TARGET, {recursive: true});
    fs.cpSync(staging, TARGET, {recursive: true});
    // Preserve docs next to assets when refreshing.
    const readmeSrc = path.join(ROOT, 'docs', 'VENDOR-FRONTEND.md');
    writeManifest({
      release: RELEASE,
      revision: spec.revision,
      signalingProtocol: spec.signalingProtocol,
      runtimeAsset: spec.filename,
      runtimeSha256: actual,
      outDir: TARGET,
    });
    console.log('Frontend vendor ready:', TARGET);
    console.log('See docs/VENDOR-FRONTEND.md for refresh steps.');
    void readmeSrc;
  } finally {
    if (child && child.exitCode === null) {
      try { child.kill(); } catch {}
      await sleep(300);
    }
    fs.rmSync(folder, {recursive: true, force: true});
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err.stack || err);
    process.exitCode = 1;
  });
}

module.exports = {assertFrontendMatchesCore, FRONTEND_RUNTIME};

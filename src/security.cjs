'use strict';

function validateSite(raw) {
  if (typeof raw !== 'string') throw Error('请输入站点地址');
  let address = raw.trim();
  if (!address) throw Error('请输入站点地址');
  if (address.length > 2048) throw Error('站点地址过长');
  if (!/^https?:\/\//i.test(address)) address = 'https://' + address;
  let url;
  try { url = new URL(address); } catch { throw Error('站点地址无效'); }
  if (url.username || url.password) throw Error('不支持在站点 URL 中放置账号密码');
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw Error('仅支持 HTTP / HTTPS');
  const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname.toLowerCase());
  if (url.protocol !== 'https:' && !local) throw Error('公网站点必须使用 HTTPS');
  if (url.search || url.hash || url.pathname !== '/') throw Error('请输入站点根地址，不包含房间路径或参数');
  return url.origin;
}

function isHttpUrl(raw) {
  try { const u = new URL(raw); return (u.protocol === 'https:' || u.protocol === 'http:') && !u.username && !u.password; }
  catch { return false; }
}

function withClientFragment(raw) {
  const url = new URL(raw);
  if (!isHttpUrl(raw)) throw Error('拒绝打开非 HTTP(S) 地址');
  const frag = new URLSearchParams(url.hash.slice(1));
  frag.set('piik-client', '1');
  url.hash = frag.toString();
  return url.toString();
}

/** Discovers redirects without allowing unbounded cross-host hops; caller must approve changed origin. */
async function resolveSite(site, fetchImpl = fetch) {
  const normalized = validateSite(site);
  const signal = AbortSignal.timeout(9000);
  // HEAD may be rejected by proxies. Fall back to GET, whose body is cancelled immediately.
  for (const method of ['HEAD', 'GET']) {
    try {
      const response = await fetchImpl(normalized, {
        method, redirect: 'follow', signal, headers: { 'User-Agent': 'PiikDesktop' }
      });
      try {
        if (!isHttpUrl(response.url)) throw Error('站点重定向到了不安全的地址');
        const finalUrl = new URL(response.url);
        const origin = validateSite(finalUrl.origin);
        return { inputOrigin: normalized, origin, url: finalUrl.href };
      } finally { if (response.body) await response.body.cancel().catch(() => {}); }
    } catch (err) {
      if (method === 'GET') throw err;
    }
  }
  throw Error('站点解析失败');
}

function safeExternalUrl(raw) {
  if (!isHttpUrl(raw)) return null;
  const url = new URL(raw);
  if (url.protocol !== 'https:') return null;
  return url.toString();
}

module.exports = {validateSite, isHttpUrl, withClientFragment, resolveSite, safeExternalUrl};

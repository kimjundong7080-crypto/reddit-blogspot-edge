import assert from 'node:assert/strict';
import { onRequestGet as feed } from './functions/api/blogger-feed.js';
import { onRequestGet as post } from './functions/api/blogger-post.js';
import { onRequestGet as health } from './functions/api/health.js';

const pending = [];
globalThis.caches = {
  default: {
    async match() { return undefined; },
    async put() {}
  }
};
const ctx = (url) => ({
  request: new Request(url),
  waitUntil(p) { pending.push(p); }
});

const h = await health();
const hj = await h.json();
assert.equal(h.status, 200);
assert.equal(hj.ok, true);
assert.equal(hj.service, 'reddit-blogspot-edge');
console.log('health ok');

const f = await feed(ctx('http://localhost/api/blogger-feed?max=3'));
if (f.status === 429) {
  console.warn('feed skipped: upstream 429 (live Blogger rate limit)');
} else {
  assert.equal(f.status, 200);
  assert.equal(f.headers.get('access-control-allow-origin'), '*');
  assert.ok(['HIT', 'MISS', 'BYPASS'].includes(f.headers.get('x-edge-cache')), 'cache header present');
  const fj = await f.json();
  assert.ok(Array.isArray(fj.feed?.entry) && fj.feed.entry.length > 0, 'feed has entries');
  console.log('feed ok entries=', fj.feed.entry.length);
}

const p = await post(ctx('http://localhost/api/blogger-post?path=/2026/10/blog-post_343.html'));
if (p.status === 429) {
  console.warn('post skipped: upstream 429 (live Blogger rate limit)');
} else {
  assert.equal(p.status, 200);
  assert.ok(['HIT', 'MISS', 'BYPASS'].includes(p.headers.get('x-edge-cache')), 'cache header present');
  const pt = await p.text();
  assert.ok(pt.length > 1000, 'post html is not empty');
  assert.ok(pt.includes('post-outer-container'), 'post html contains post container');
  console.log('post ok bytes=', pt.length);
}

const bad = await post(ctx('http://localhost/api/blogger-post?url=https%3A%2F%2Fevil.example%2Fx.html'));
assert.equal(bad.status, 400);
assert.equal((await bad.json()).error, 'invalid_post_url');
console.log('allowlist ok');

await Promise.all(pending);
console.log('all tests passed');

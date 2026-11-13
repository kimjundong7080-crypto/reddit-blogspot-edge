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
console.log('health', h.status, (await h.json()).ok);

const f = await feed(ctx('http://localhost/api/blogger-feed?max=3'));
const fj = await f.json();
console.log('feed', f.status, 'entries=', fj.feed?.entry?.length, 'cors=', f.headers.get('access-control-allow-origin'));

const p = await post(ctx('http://localhost/api/blogger-post?path=/2026/10/blog-post_343.html'));
const pt = await p.text();
console.log('post', p.status, 'html=', pt.length, 'hasPost=', pt.includes('post-outer-container'));

const bad = await post(ctx('http://localhost/api/blogger-post?url=https%3A%2F%2Fevil.example%2Fx.html'));
console.log('bad', bad.status, (await bad.json()).error);

await Promise.all(pending);

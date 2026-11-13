import { json } from './_utils.js';

export async function onRequestGet() {
  return json({
    ok: true,
    service: 'reddit-blogspot-edge',
    version: '1.0.0',
    endpoints: {
      feed: '/api/blogger-feed?max=100',
      post: '/api/blogger-post?url=<encoded post URL>'
    },
    now: new Date().toISOString()
  });
}

export async function onRequestOptions() {
  return json({ ok: true });
}

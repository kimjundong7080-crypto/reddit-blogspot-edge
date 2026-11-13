import {
  BLOG_ORIGIN,
  CORS_HEADERS,
  cachedFetch,
  feedUrl,
  json,
  parseMax
} from './_utils.js';

/**
 * GET /api/blogger-feed?max=100
 * Returns the public Blogger JSON feed through the edge cache.
 */
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const max = parseMax(url.searchParams.get('max'), 100, 500);
  const target = feedUrl(max);

  try {
    const upstream = await cachedFetch(context, target, 300);
    const headers = new Headers(upstream.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
    headers.set('X-CF-Cache', upstream.headers.get('CF-Cache-Status') || 'EDGE');
    headers.set('X-Blogger-Upstream', BLOG_ORIGIN);
    headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400, stale-if-error=86400');
    headers.set('CDN-Cache-Control', 'public, max-age=300, stale-while-revalidate=86400, stale-if-error=86400');
    headers.set('Vary', 'Accept-Encoding');
    return new Response(upstream.body, {
      status: upstream.status,
      headers
    });
  } catch (error) {
    return json({ ok: false, error: 'feed_fetch_failed', message: String(error) }, 502);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

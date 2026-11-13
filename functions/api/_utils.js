export const BLOG_HOST = 'prfom121.blogspot.com';
export const BLOG_ORIGIN = `https://${BLOG_HOST}`;
export const CORS_ORIGIN = '*';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'X-Content-Type-Options': 'nosniff'
};

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extra
    }
  });
}

export function withCors(response, extra = {}) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
  for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

export function parseMax(value, fallback = 100, max = 500) {
  const n = Number.parseInt(value || '', 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export function isAllowedPostUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === BLOG_HOST &&
      /^\/\d{4}\/\d{2}\/[^/]+\.html$/.test(url.pathname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function feedUrl(max) {
  return `${BLOG_ORIGIN}/feeds/posts/default?alt=json&max-results=${parseMax(max)}`;
}

/**
 * Edge-cache a same-origin Blogger response.
 * Cache API keys are full request URLs; only allowlisted URLs are passed here.
 */
export async function cachedFetch(context, target, ttl = 300) {
  const cache = globalThis.caches?.default;
  if (cache) {
    const hit = await cache.match(target);
    if (hit) {
      const headers = new Headers(hit.headers);
      headers.set('X-Edge-Cache', 'HIT');
      return new Response(hit.body, {
        status: hit.status,
        statusText: hit.statusText,
        headers
      });
    }
  }

  const upstream = await fetch(target, {
    headers: {
      'User-Agent': 'reddit-blogspot-edge/1.0 (+https://prfom121.blogspot.com)',
      Accept: '*/*'
    },
    cf: {
      cacheTtl: ttl,
      cacheEverything: true
    }
  });

  const headers = new Headers(upstream.headers);
  headers.delete('set-cookie');
  headers.delete('content-security-policy');
  headers.set('Cache-Control', `public, max-age=60, s-maxage=${ttl}`);
  headers.set('X-Edge-Cache', cache ? 'MISS' : 'BYPASS');
  const response = new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });

  if (cache && upstream.ok) {
    context.waitUntil(cache.put(target, response.clone()).catch(() => {}));
  }
  return response;
}

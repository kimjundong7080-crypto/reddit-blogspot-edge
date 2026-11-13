import {
  BLOG_ORIGIN,
  CORS_HEADERS,
  cachedFetch,
  isAllowedPostUrl,
  json
} from './_utils.js';

/**
 * GET /api/blogger-post?url=https%3A%2F%2Fprfom121.blogspot.com%2F2026%2F10%2Fpost.html
 * GET /api/blogger-post?path=/2026/10/post.html
 *
 * Returns the public post HTML (same markup as the Blogger page) through the edge.
 * Only this blog's post URLs are accepted, preventing an open proxy.
 */
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const rawUrl = url.searchParams.get('url');
  const path = url.searchParams.get('path');

  let target;
  if (rawUrl) {
    target = rawUrl;
  } else if (path && path.startsWith('/')) {
    target = `${BLOG_ORIGIN}${path}`;
  }

  if (!target || !isAllowedPostUrl(target)) {
    return json(
      {
        ok: false,
        error: 'invalid_post_url',
        hint: 'Only https://prfom121.blogspot.com/YYYY/MM/*.html is allowed.'
      },
      400
    );
  }

  try {
    const upstream = await cachedFetch(context, target, 300);
    const headers = new Headers(upstream.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
    headers.set('X-Blogger-Upstream', BLOG_ORIGIN);
    headers.set('X-Robots-Tag', 'noindex');
    return new Response(upstream.body, {
      status: upstream.status,
      headers
    });
  } catch (error) {
    return json({ ok: false, error: 'post_fetch_failed', message: String(error) }, 502);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

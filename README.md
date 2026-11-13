# reddit-blogspot-edge

Cloudflare Pages Functions for the Reddit-style Blogger theme at **prfom121.blogspot.com**.

**Production:** https://reddit-blogspot-edge.pages.dev  
**Pages project:** `reddit-blogspot-edge`  
**Deployed:** 2026-11-13

## Purpose

- Edge-cache the public Blogger JSON feed.
- Proxy only this blog's public post HTML to avoid browser/CORS timing issues.
- Keep the browser-facing API same-origin-ish and read-only.

No secrets are stored in the repo. No write endpoints.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | health + version |
| GET | `/api/blogger-feed?max=100` | Blogger JSON feed, max 500, 5-min edge cache |
| GET | `/api/blogger-post?path=/2026/10/post.html` | post HTML proxy |
| GET | `/api/blogger-post?url=https%3A%2F%2F...` | same, URL form |

### Allowlist

Only these targets are accepted:

- `https://prfom121.blogspot.com/feeds/posts/default`
- `https://prfom121.blogspot.com/YYYY/MM/*.html`

Everything else returns `400 invalid_post_url`.

## Local development

```bash
npm install
npm run dev
# http://localhost:8788
```

Wrangler provides a local Cache API in Pages dev.

## Deploy

```bash
# one-time, after `wrangler login` or CLOUDFLARE_API_TOKEN is set
npx wrangler pages project create reddit-blogspot-edge --production-branch main

# deploy
npm run deploy
```

Non-interactive:

```powershell
$env:CLOUDFLARE_API_TOKEN = "..."
$env:CLOUDFLARE_ACCOUNT_ID = "..."
npx wrangler pages deploy public --project-name reddit-blogspot-edge --branch main
```

Required token permissions:

- Account → Cloudflare Pages → Edit
- Account → Account Settings → Read

## After deploy

Use the Pages URL in the Blogger loader:

```js
const EDGE = 'https://reddit-blogspot-edge.pages.dev';
fetch(EDGE + '/api/blogger-feed?max=500')
```

The current `11_infinite.js` still fetches Blogger directly. The next step is switching its feed/post fetch calls to this edge API and adding `<link rel="preconnect">` for the Pages host.

## GitHub auto deploy

This repository is intended to be connected to the Pages project:

- Repository: `kimjundong7080-crypto/reddit-blogspot-edge`
- Pages project: `reddit-blogspot-edge`
- Production branch: `main`
- Build command: none
- Build output directory: `public`
- Functions directory: `functions/`

In Cloudflare Pages → project → Settings → Builds & deployments → Git repository, connect the repository above. Pushes to `main` then deploy automatically.

## Notes

- Cache key is the upstream URL; responses are cached 5 minutes.
- `Set-Cookie` and `Content-Security-Policy` are stripped from proxied responses.
- Functions only handle `GET`/`OPTIONS`.

<!-- auto deploy check: 2026-11-13 -->

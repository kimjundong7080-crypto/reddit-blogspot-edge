# reddit-blogspot-edge

Cloudflare Pages Functions for the Reddit-style Blogger theme at **prfom121.blogspot.com**.

**Production:** https://reddit-blogspot-edge-git.pages.dev  
**Pages project:** `reddit-blogspot-edge-git` (Git-connected)  
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

GitHub auto deploy is active: every push to `main` builds and deploys the project.

Manual fallback:

```bash
npm run deploy
```

Non-interactive:

```powershell
$env:CLOUDFLARE_API_TOKEN = "..."
$env:CLOUDFLARE_ACCOUNT_ID = "..."
npx wrangler pages deploy public --project-name reddit-blogspot-edge-git --branch main
```

Required token permissions:

- Account → Cloudflare Pages → Edit
- Account → Account Settings → Read

## After deploy

Use the Pages URL in the Blogger loader:

```js
const EDGE = 'https://reddit-blogspot-edge-git.pages.dev';
fetch(EDGE + '/api/blogger-feed?max=500')
```

The live `11_infinite.js` (CDN `v1.0.2`) uses this edge API and falls back to Blogger directly if the edge call fails.

## GitHub auto deploy

This repository is intended to be connected to the Pages project:

- Repository: `kimjundong7080-crypto/reddit-blogspot-edge`
- Pages project: `reddit-blogspot-edge-git`
- Production branch: `main`
- Build command: none
- Build output directory: `public`
- Functions directory: `functions/`

In Cloudflare Pages → project → Settings → Builds & deployments → Git repository, the repository above is connected. Pushes to `main` deploy automatically.

## Notes

- Cache key is the upstream URL; responses are cached 5 minutes.
- `Set-Cookie` and `Content-Security-Policy` are stripped from proxied responses.
- Functions only handle `GET`/`OPTIONS`.

<!-- auto deploy check: 2026-11-13 -->

<!-- auto deploy verified: 2026-11-13 -->

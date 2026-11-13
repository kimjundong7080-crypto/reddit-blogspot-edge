import fs from 'node:fs';

const BASE = (process.env.EDGE_BASE || 'https://reddit-blogspot-edge.pages.dev').replace(/\/$/, '');
const WARMUP_DELAY = 500;
const summaryLines = ['# Edge API monitor', '', `- Base: ${BASE}`, `- Time: ${new Date().toISOString()}`, ''];
const failures = [];
const checks = [];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function request(url) {
  const started = Date.now();
  const res = await fetch(url, {
    headers: { 'User-Agent': 'reddit-blogspot-edge-monitor/1.0' },
    cache: 'no-store'
  });
  const text = await res.text();
  return {
    url,
    status: res.status,
    cache: (res.headers.get('x-edge-cache') || '').toUpperCase(),
    ms: Date.now() - started,
    text
  };
}

function record(name, r) {
  checks.push({ name, ...r, text: undefined });
  summaryLines.push(
    `- **${name}**: status=${r.status}, edge-cache=${r.cache || 'none'}, ${r.ms}ms`
  );
  if (r.status === 429) failures.push(`${name}: upstream 429`);
  else if (r.status >= 500) failures.push(`${name}: ${r.status}`);
  else if (r.status !== 200) failures.push(`${name}: unexpected ${r.status}`);
  if ((name === 'feed' || name === 'post') && !['HIT', 'MISS', 'BYPASS'].includes(r.cache)) {
    failures.push(`${name}: missing X-Edge-Cache`);
  }
}

try {
  const health = await request(`${BASE}/api/health`);
  record('health', health);

  await request(`${BASE}/api/blogger-feed?max=3`);
  await sleep(WARMUP_DELAY);
  const feed = await request(`${BASE}/api/blogger-feed?max=3`);
  record('feed', feed);

  let postUrl = '';
  try {
    const data = JSON.parse(feed.text);
    postUrl = (data.feed?.entry?.[0]?.link || []).find(l => l.rel === 'alternate')?.href || '';
  } catch {}

  if (postUrl) {
    await request(`${BASE}/api/blogger-post?url=${encodeURIComponent(postUrl)}`);
    await sleep(WARMUP_DELAY);
    const post = await request(`${BASE}/api/blogger-post?url=${encodeURIComponent(postUrl)}`);
    record('post', post);
  } else {
    failures.push('post: no feed entry URL');
    summaryLines.push('- **post**: skipped (no feed entry URL)');
  }

  const cached = checks.filter(c => c.name === 'feed' || c.name === 'post');
  const hits = cached.filter(c => c.cache === 'HIT').length;
  const rate = cached.length ? hits / cached.length : 0;
  summaryLines.push('', `- **Cache HIT rate**: ${(rate * 100).toFixed(1)}% (${hits}/${cached.length})`);
  if (rate < 0.8) failures.push(`cache hit rate ${(rate * 100).toFixed(1)}% < 80%`);
} catch (error) {
  failures.push(`monitor exception: ${String(error)}`);
}

summaryLines.push('', failures.length ? '## Result: FAIL' : '## Result: PASS');
if (failures.length) {
  summaryLines.push('', '### Failures', ...failures.map(f => `- ${f}`));
}

const summary = summaryLines.join('\n') + '\n';
fs.writeFileSync('monitor-summary.md', summary, 'utf8');
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}
console.log(summary);
if (failures.length) process.exitCode = 1;

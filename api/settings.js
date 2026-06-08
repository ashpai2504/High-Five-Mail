// Cross-device settings store (subject, system prompt, signature).
// Backed by Upstash Redis (a.k.a. Vercel KV) via its REST API, so edits made by
// the user persist server-side and appear on any device after a refresh.
//
// Provision once: Vercel -> Storage -> Create Database -> Upstash for Redis
// (or "KV") -> connect to this project. That auto-adds the env vars below.
// Works with either KV_REST_API_* or UPSTASH_REDIS_REST_* naming.

const KEY = 'high-five-settings';

function redisConfig() {
  const env = process.env;
  // Known names first (Vercel KV / Upstash native)...
  let url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  let token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  // ...otherwise auto-detect whatever prefix Vercel used (e.g. STORAGE_REST_API_URL).
  if (!url || !token) {
    for (const k of Object.keys(env)) {
      const v = env[k];
      if (!v) continue;
      if (!url && /REST_API_URL$/.test(k)) url = v;
      if (!token && /REST_API_TOKEN$/.test(k) && !/READ_ONLY/.test(k)) token = v;
    }
  }
  return url && token ? { url, token } : null;
}

async function redis(cfg, command) {
  const r = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!r.ok) throw new Error(`Storage error (HTTP ${r.status})`);
  const j = await r.json();
  return j.result;
}

module.exports = async (req, res) => {
  const cfg = redisConfig();
  if (!cfg) {
    // No store provisioned yet — tell the client to fall back to local-only.
    res.status(501).json({ error: 'no-storage' });
    return;
  }
  try {
    if (req.method === 'GET') {
      const raw = await redis(cfg, ['GET', KEY]);
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(raw ? JSON.parse(raw) : {});
      return;
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const str = v => (typeof v === 'string' ? v : '');
      const settings = {
        subject: str(body.subject),
        systemPrompt: str(body.systemPrompt),
        signature: str(body.signature),
      };
      await redis(cfg, ['SET', KEY, JSON.stringify(settings)]);
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Unexpected error' });
  }
};

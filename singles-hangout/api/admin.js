const { redis, all, clean, isAdmin, KEY } = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Wrong password' });
  const { action, id, fields, paid } = req.body || {};
  try {
    if (action === 'login') return res.status(200).json({ ok: true });
    if (action === 'list') return res.status(200).json({ regs: (await all()).sort((a, b) => b.t - a.t) });
    if (action === 'delete') { await redis('HDEL', KEY, String(id)); return res.status(200).json({ ok: true }); }
    const raw = await redis('HGET', KEY, String(id));
    if (!raw) return res.status(404).json({ error: 'Not found' });
    const cur = JSON.parse(raw);
    if (action === 'paid') cur.paid = !!paid, cur.paidAt = paid ? Date.now() : null;
    else if (action === 'update') {
      const c = clean(fields || {});
      if (c.error) return res.status(400).json({ error: c.error });
      Object.assign(cur, c.data);
    } else return res.status(400).json({ error: 'Unknown action' });
    await redis('HSET', KEY, cur.id, JSON.stringify(cur));
    res.status(200).json({ ok: true, reg: cur });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
};

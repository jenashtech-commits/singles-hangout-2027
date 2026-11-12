const crypto = require('crypto');
const { redis, all, clean, isAdmin, last9, normChurch, normAge, KEY } = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Wrong password' });
  const { action, id, fields, paid } = req.body || {};
  try {
    if (action === 'login') return res.status(200).json({ ok: true });
    if (action === 'list') return res.status(200).json({ regs: (await all()).sort((a, b) => b.t - a.t) });
    if (action === 'delete') { await redis('HDEL', KEY, String(id)); return res.status(200).json({ ok: true }); }
    if (action === 'import') {
      const rows = Array.isArray(req.body.rows) ? req.body.rows.slice(0, 500) : [];
      const regs = await all(), now = Date.now(), args = [], skipped = [];
      const phones = new Set(regs.map(r => last9(r.phone)).filter(Boolean));
      const byName = new Map(regs.map(r => [r.name.toLowerCase() + '|' + r.church, r])), upd = [];
      rows.forEach((x, i) => {
        const c = clean({ ...x, church: normChurch(x.church), age: normAge(x.age) }, true);
        if (c.error) { skipped.push((x.name || '(blank)') + ': ' + c.error); return; }
        const p = last9(c.data.phone), nk = c.data.name.toLowerCase() + '|' + c.data.church;
        const ex = byName.get(nk) || (p && regs.find(r => last9(r.phone) === p));
        if (ex) {
          let ch = false;
          for (const k of ['phone', 'age', 'diet']) if (!ex[k] && c.data[k]) { ex[k] = c.data[k]; ch = true; }
          if (ch && !upd.includes(ex)) upd.push(ex); else if (!ch) skipped.push(c.data.name + ': already registered');
          return;
        }
        if (p) phones.add(p);
        const rid = 'WR-' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
        byName.set(nk, { name: c.data.name }); args.push(rid, JSON.stringify({ id: rid, ...c.data, paid: !!x.paid, t: now - i, imported: true }));
      });
      upd.forEach(r => args.push(r.id, JSON.stringify(r)));
      if (args.length) await redis('HSET', KEY, ...args);
      return res.status(200).json({ added: args.length / 2 - upd.length, updated: upd.length, skipped });
    }
    const raw = await redis('HGET', KEY, String(id));
    if (!raw) return res.status(404).json({ error: 'Not found' });
    const cur = JSON.parse(raw);
    if (action === 'paid') cur.paid = !!paid, cur.paidAt = paid ? Date.now() : null;
    else if (action === 'update') {
      const c = clean(fields || {}, true);
      if (c.error) return res.status(400).json({ error: c.error });
      Object.assign(cur, c.data);
    } else return res.status(400).json({ error: 'Unknown action' });
    await redis('HSET', KEY, cur.id, JSON.stringify(cur));
    res.status(200).json({ ok: true, reg: cur });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
};

const crypto = require('crypto');
const { redis, all, clean, last9, KEY, DEADLINE } = require('./_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const b = req.body || {};
  if (b.website) return res.status(200).json({ ref: 'OK' }); // honeypot for bots
  if (Date.now() > DEADLINE) return res.status(403).json({ error: 'Registration has closed.' });
  const c = clean(b);
  if (c.error) return res.status(400).json({ error: c.error });
  try {
    const regs = await all();
    const dup = regs.find(r => last9(r.phone) === last9(c.data.phone));
    if (dup) return res.status(200).json({ ref: dup.id, existing: true });
    const ref = 'WR-' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
    await redis('HSET', KEY, ref, JSON.stringify({ id: ref, ...c.data, paid: false, t: Date.now() }));
    res.status(200).json({ ref });
  } catch (e) { res.status(500).json({ error: 'Could not save. Please try again.' }); }
};

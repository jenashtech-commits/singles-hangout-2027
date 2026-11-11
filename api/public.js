const { all, DEADLINE } = require('./_lib');
// Public, privacy-safe data: counts, masked names, and the caller's own status.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const regs = await all();
    const ref = String((req.query && req.query.ref) || '');
    const me = ref ? regs.find(r => r.id === ref) : null;
    const roster = regs.sort((a, b) => b.t - a.t).slice(0, 12).map(r => ({
      n: r.name.replace(/^(\S+)\s+(\S).*$/, '$1 $2.'), a: r.age, paid: !!r.paid, t: r.t
    }));
    res.status(200).json({
      total: regs.length, paid: regs.filter(r => r.paid).length, closed: Date.now() > DEADLINE, roster,
      me: me ? { name: me.name, paid: !!me.paid } : null
    });
  } catch (e) { res.status(500).json({ error: 'Service unavailable' }); }
};

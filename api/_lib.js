const crypto = require('crypto');
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'wr:regs';
const ASSEMBLIES = ['Central', 'Maranatha', 'Nsumfa', 'Berea', 'Bethel', 'NIC', 'External'];
const AGES = ['Young Adult (20–25)', 'Young Adult (26–35)', 'Young Adult (36+)'];
// Registration closes end of 28 Dec 2026 (Ghana = UTC)
const DEADLINE = Date.UTC(2026, 11, 28, 23, 59, 59);

async function redis(...cmd) {
  if (!URL_ || !TOK) throw new Error('Database not connected');
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: 'Bearer ' + TOK }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
async function all() {
  const a = (await redis('HGETALL', KEY)) || [];
  const out = [];
  for (let i = 0; i < a.length; i += 2) out.push(JSON.parse(a[i + 1]));
  return out;
}
function clean(b, lenient) {
  const name = String(b.name || '').trim().replace(/\s+/g, ' ');
  const phone = String(b.phone || '').replace(/[^\d+]/g, '');
  const age = String(b.age || '');
  const church = String(b.church || '');
  const diet = String(b.diet || '').trim().slice(0, 200);
  if (name.length < 2 || name.length > 80 || (!lenient && name.split(' ').length < 2)) return { error: 'Please enter first and last name.' };
  if (!(lenient && !phone) && (phone.replace(/\D/g, '').length < 9 || phone.length > 15)) return { error: 'Please enter a valid phone number.' };
  if (!(lenient && !age) && !AGES.includes(age)) return { error: 'Please choose an age range.' };
  if (!ASSEMBLIES.includes(church)) return { error: 'Please choose your local assembly.' };
  return { data: { name, phone, age, church, diet } };
}
const h = s => crypto.createHash('sha256').update(String(s)).digest();
function isAdmin(req) {
  const p = process.env.ADMIN_PASSWORD;
  if (!p) return false;
  return crypto.timingSafeEqual(h(req.headers['x-admin-password'] || ''), h(p));
}
function normChurch(s) {
  const t = String(s || '').toLowerCase().replace(/^anyaa\s+/, '').trim();
  if (t === 'nsunfa') return 'Nsumfa';
  return ASSEMBLIES.find(a => a.toLowerCase() === t) || String(s || '').trim();
}
function normAge(s) {
  const t = String(s || '').trim().replace(/[-—]/g, '–');
  return AGES.find(a => a === t) || '';
}
const last9 = p => String(p).replace(/\D/g, '').slice(-9);
module.exports = { normChurch, normAge, redis, all, clean, isAdmin, last9, KEY, ASSEMBLIES, AGES, DEADLINE };

// Server-side helpers shared by every /api route. Not itself a route.
// The service key is read from the environment only and never returned.
const crypto = require('crypto');

const URL_ = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const ANON = process.env.SUPABASE_ANON_KEY || '';
const SERVICE = process.env.SUPABASE_SERVICE_KEY || '';
const ROLES = ['owner', 'admin', 'user'];

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function keyHeaders(key) {
  // New-style keys (sb_publishable_ / sb_secret_) go in apikey only.
  // Legacy JWT keys also go in Authorization.
  const h = { apikey: key };
  if (!key.startsWith('sb_')) h.Authorization = 'Bearer ' + key;
  return h;
}

function roleOf(user) {
  const r = user && user.app_metadata && user.app_metadata.role;
  return ROLES.includes(r) ? r : 'user';
}

// Validates the caller's access token with Supabase. Never trusts a role from the browser.
async function getCaller(req) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return { error: [401, 'Missing access token'] };
  const token = m[1].trim();
  const r = await fetch(URL_ + '/auth/v1/user', {
    headers: { apikey: ANON, Authorization: 'Bearer ' + token },
  });
  if (!r.ok) return { error: [401, 'Invalid or expired session'] };
  const user = await r.json();
  if (!user || !user.id) return { error: [401, 'Invalid session'] };
  if (user.banned_until && new Date(user.banned_until) > new Date()) {
    return { error: [403, 'Account disabled'] };
  }
  return { user, token, role: roleOf(user) };
}

async function requireRole(req, res, allowed) {
  if (!URL_ || !ANON) { send(res, 500, { error: 'Server not configured' }); return null; }
  const c = await getCaller(req);
  if (c.error) { send(res, c.error[0], { error: c.error[1] }); return null; }
  if (allowed && !allowed.includes(c.role)) { send(res, 403, { error: 'Not permitted' }); return null; }
  return c;
}

function requireService(res) {
  if (!SERVICE) { send(res, 500, { error: 'SUPABASE_SERVICE_KEY is not set on the server' }); return false; }
  return true;
}

async function admin(path, opts = {}) {
  const r = await fetch(URL_ + '/auth/v1/admin' + path, {
    method: opts.method || 'GET',
    headers: { ...keyHeaders(SERVICE), 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await r.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
  if (!r.ok) {
    const msg = (data && (data.msg || data.message || data.error_description || data.error)) || ('Auth admin error ' + r.status);
    const err = new Error(msg); err.status = r.status; throw err;
  }
  return data;
}

async function rest(path, opts = {}) {
  const headers = opts.token
    ? { apikey: ANON, Authorization: 'Bearer ' + opts.token }
    : keyHeaders(SERVICE);
  const r = await fetch(URL_ + '/rest/v1/' + path, {
    method: opts.method || 'GET',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: opts.prefer || 'return=representation' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await r.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (!r.ok) {
    const err = new Error((data && (data.message || data.hint)) || ('Database error ' + r.status)); err.status = r.status; throw err;
  }
  return data;
}

async function recoverEmail(email, redirectTo) {
  const q = redirectTo ? '?redirect_to=' + encodeURIComponent(redirectTo) : '';
  const r = await fetch(URL_ + '/auth/v1/recover' + q, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) {
    let d = {}; try { d = await r.json(); } catch (e) {}
    const err = new Error(d.msg || d.message || 'Could not send recovery email'); err.status = r.status; throw err;
  }
}

// Cryptographically secure temporary password, 16 chars, no ambiguous characters.
function tempPassword(len = 16) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%*?-'];
  const all = sets.join('');
  const out = sets.map(s => s[crypto.randomInt(s.length)]);
  while (out.length < len) out.push(all[crypto.randomInt(all.length)]);
  for (let i = out.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out.join('');
}

async function audit(actorId, targetId, action, detail) {
  try {
    await rest('admin_audit_log', { method: 'POST', prefer: 'return=minimal', body: { actor_id: actorId, target_id: targetId, action, detail: detail || {} } });
  } catch (e) { console.error('audit write failed', e.message); }
}

function siteOrigin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return proto + '://' + host;
}

async function countOwners() {
  const users = await listAllUsers();
  return users.filter(u => roleOf(u) === 'owner').length;
}

async function listAllUsers() {
  let page = 1, all = [];
  for (;;) {
    const d = await admin('/users?page=' + page + '&per_page=200');
    const list = (d && d.users) || [];
    all = all.concat(list);
    if (list.length < 200) break;
    page++;
  }
  return all;
}

module.exports = { send, getCaller, requireRole, requireService, admin, rest, recoverEmail, tempPassword, audit, roleOf, siteOrigin, countOwners, listAllUsers, ROLES };

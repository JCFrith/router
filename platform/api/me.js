// GET: own profile. PUT: update own profile (RLS-enforced with the caller's own token).
// POST {action:"password_changed"}: clears the temporary-password flag after the user sets a new one.
const A = require('../lib/auth');
const FIELDS = ['full_name', 'phone', 'address_line', 'city', 'state', 'postal_code'];

module.exports = async (req, res) => {
  const c = await A.requireRole(req, res);
  if (!c) return;
  try {
    if (req.method === 'GET') {
      const rows = await A.rest('profiles?select=' + FIELDS.join(',') + ',updated_at&id=eq.' + c.user.id, { token: c.token });
      return A.send(res, 200, {
        id: c.user.id, email: c.user.email, role: c.role,
        mustChangePassword: !!(c.user.app_metadata && c.user.app_metadata.must_change_password),
        profile: (rows && rows[0]) || {},
      });
    }
    if (req.method === 'PUT') {
      const b = req.body || {};
      const patch = {};
      for (const f of FIELDS) if (f in b) patch[f] = b[f] == null ? null : String(b[f]).trim().slice(0, 200) || null;
      const rows = await A.rest('profiles?id=eq.' + c.user.id, { method: 'PATCH', token: c.token, body: patch });
      if (!rows || !rows.length) return A.send(res, 404, { error: 'Profile not found' });
      return A.send(res, 200, { profile: rows[0] });
    }
    if (req.method === 'POST' && req.body && req.body.action === 'password_changed') {
      if (!(c.user.app_metadata && c.user.app_metadata.must_change_password)) return A.send(res, 200, { ok: true });
      if (!A.requireService(res)) return;
      await A.admin('/users/' + c.user.id, { method: 'PUT', body: { app_metadata: { must_change_password: false } } });
      return A.send(res, 200, { ok: true });
    }
    res.setHeader('Allow', 'GET, PUT, POST');
    return A.send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return A.send(res, e.status && e.status < 500 ? e.status : 500, { error: e.message });
  }
};

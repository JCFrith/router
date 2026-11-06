// GET: list users. POST {email, full_name, role, mode:"temp"|"email"}: create a user.
const A = require('../../lib/auth');

module.exports = async (req, res) => {
  const c = await A.requireRole(req, res, ['owner', 'admin']);
  if (!c) return;
  if (!A.requireService(res)) return;
  try {
    if (req.method === 'GET') {
      const users = await A.listAllUsers();
      const profiles = await A.rest('profiles?select=id,full_name');
      const names = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
      const now = new Date();
      return A.send(res, 200, {
        callerId: c.user.id, callerRole: c.role,
        users: users.map(u => ({
          id: u.id, email: u.email, name: names[u.id] || '', role: A.roleOf(u),
          status: u.banned_until && new Date(u.banned_until) > now ? 'disabled' : 'active',
          created_at: u.created_at, last_sign_in_at: u.last_sign_in_at || null,
        })),
      });
    }
    if (req.method === 'POST') {
      const b = req.body || {};
      const email = String(b.email || '').trim().toLowerCase();
      const name = String(b.full_name || '').trim().slice(0, 200);
      const role = String(b.role || 'user');
      const mode = b.mode === 'email' ? 'email' : 'temp';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return A.send(res, 400, { error: 'Enter a valid email' });
      if (!['admin', 'user'].includes(role)) return A.send(res, 400, { error: 'Role must be admin or user' });
      if (role === 'admin' && c.role !== 'owner') return A.send(res, 403, { error: 'Only an Owner can create Admins' });

      const password = A.tempPassword();
      const created = await A.admin('/users', {
        method: 'POST',
        body: { email, password, email_confirm: true, app_metadata: { role, must_change_password: mode === 'temp' } },
      });
      if (name) await A.rest('profiles?id=eq.' + created.id, { method: 'PATCH', body: { full_name: name } });
      let emailSent = false, emailError = null;
      if (mode === 'email') {
        try { await A.recoverEmail(email, A.siteOrigin(req) + '/reset.html'); emailSent = true; }
        catch (e) { emailError = e.message; }
      }
      await A.audit(c.user.id, created.id, 'create_user', { email, role, mode });
      return A.send(res, 201, {
        id: created.id, email, role,
        tempPassword: mode === 'temp' ? password : null,
        emailSent, emailError,
      });
    }
    res.setHeader('Allow', 'GET, POST');
    return A.send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return A.send(res, e.status && e.status < 500 ? e.status : 500, { error: e.message });
  }
};

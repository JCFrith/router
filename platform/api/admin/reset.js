// POST {id, mode:"temp"|"email"}: new temporary password (shown once) or recovery email.
const A = require('../../lib/auth');
const { prepare } = require('../../lib/target');

module.exports = async (req, res) => {
  const t = await prepare(req, res, 'reset');
  if (!t) return;
  try {
    const mode = req.body.mode === 'email' ? 'email' : 'temp';
    if (mode === 'temp') {
      const password = A.tempPassword();
      await A.admin('/users/' + t.target.id, { method: 'PUT', body: { password, app_metadata: { must_change_password: true } } });
      await A.audit(t.c.user.id, t.target.id, 'reset_password', { mode });
      return A.send(res, 200, { tempPassword: password });
    }
    await A.recoverEmail(t.target.email, A.siteOrigin(req) + '/reset.html');
    await A.audit(t.c.user.id, t.target.id, 'reset_password', { mode });
    return A.send(res, 200, { emailSent: true });
  } catch (e) {
    return A.send(res, e.status && e.status < 500 ? e.status : 500, { error: e.message });
  }
};

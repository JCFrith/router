// POST {id, disabled:true|false}: ban or unban without deleting data.
const A = require('../../lib/auth');
const { prepare } = require('../../lib/target');

module.exports = async (req, res) => {
  const disabled = !!(req.body && req.body.disabled);
  const t = await prepare(req, res, disabled ? 'disable' : 'enable');
  if (!t) return;
  try {
    await A.admin('/users/' + t.target.id, { method: 'PUT', body: { ban_duration: disabled ? '876000h' : 'none' } });
    await A.audit(t.c.user.id, t.target.id, disabled ? 'disable_user' : 'enable_user', { email: t.target.email });
    return A.send(res, 200, { status: disabled ? 'disabled' : 'active' });
  } catch (e) {
    return A.send(res, e.status && e.status < 500 ? e.status : 500, { error: e.message });
  }
};

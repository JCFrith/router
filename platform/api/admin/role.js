// POST {id, role}: Owner only. Cannot demote the last remaining Owner.
const A = require('../../lib/auth');
const { prepare } = require('../../lib/target');

module.exports = async (req, res) => {
  const role = String((req.body && req.body.role) || '');
  if (!A.ROLES.includes(role)) return A.send(res, 400, { error: 'Role must be owner, admin or user' });
  const t = await prepare(req, res, 'role', { newRole: role });
  if (!t) return;
  try {
    const from = A.roleOf(t.target);
    await A.admin('/users/' + t.target.id, { method: 'PUT', body: { app_metadata: { role } } });
    await A.audit(t.c.user.id, t.target.id, 'change_role', { from, to: role });
    return A.send(res, 200, { role });
  } catch (e) {
    return A.send(res, e.status && e.status < 500 ? e.status : 500, { error: e.message });
  }
};

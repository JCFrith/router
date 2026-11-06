// POST {id, confirmEmail}: hard delete of the auth user and profile row.
const A = require('../../lib/auth');
const { prepare } = require('../../lib/target');

module.exports = async (req, res) => {
  const t = await prepare(req, res, 'remove');
  if (!t) return;
  const typed = String((req.body && req.body.confirmEmail) || '').trim().toLowerCase();
  if (typed !== String(t.target.email || '').toLowerCase()) return A.send(res, 400, { error: 'Typed email does not match' });
  try {
    // Profile row is removed by ON DELETE CASCADE from auth.users.
    try { await A.admin('/users/' + t.target.id, { method: 'DELETE' }); }
    catch (e) {
      if (/database error/i.test(e.message)) return A.send(res, 409, { error: 'This user has saved routes or store history tied to their account, so they cannot be deleted without losing that record. Disable them instead.' });
      throw e;
    }
    await A.audit(t.c.user.id, t.target.id, 'remove_user', { email: t.target.email, role: A.roleOf(t.target) });
    return A.send(res, 200, { removed: true });
  } catch (e) {
    return A.send(res, e.status && e.status < 500 ? e.status : 500, { error: e.message });
  }
};

// Loads the target user for an admin action and runs the policy check.
const A = require('./auth');
const P = require('./policy');

async function prepare(req, res, action, extra = {}) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); A.send(res, 405, { error: 'Method not allowed' }); return null; }
  const c = await A.requireRole(req, res, ['owner', 'admin']);
  if (!c) return null;
  if (!A.requireService(res)) return null;
  const id = String((req.body && req.body.id) || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) { A.send(res, 400, { error: 'Missing user id' }); return null; }
  let target;
  try { target = await A.admin('/users/' + id); }
  catch (e) { A.send(res, e.status === 404 ? 404 : 500, { error: e.status === 404 ? 'User not found' : e.message }); return null; }
  const needsCount = action === 'role' || action === 'disable';
  const ownerCount = needsCount ? await A.countOwners() : null;
  const err = P.check(c, target, action, { ...extra, ownerCount });
  if (err) { A.send(res, 403, { error: err }); return null; }
  return { c, target };
}

module.exports = { prepare };

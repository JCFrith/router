// Who may do what to whom. Enforced server-side on every admin route.
const { roleOf } = require('./auth');

// Returns null if allowed, or an error string.
function check(caller, target, action, opts = {}) {
  const cRole = caller.role;
  const tRole = roleOf(target);
  const self = caller.user.id === target.id;

  if (!['owner', 'admin'].includes(cRole)) return 'Not permitted';

  if (action === 'remove') {
    if (self) return 'You cannot remove yourself';
    if (tRole === 'owner') return 'Owners cannot be removed from this page';
    if (tRole === 'admin' && cRole !== 'owner') return 'Admins can only remove Users';
    return null;
  }

  if (action === 'disable' && self) return 'You cannot disable yourself';

  if (action === 'role') {
    if (cRole !== 'owner') return 'Only an Owner can change roles';
    if (tRole === 'owner' && opts.newRole !== 'owner' && opts.ownerCount <= 1) return 'Cannot demote the last remaining Owner';
    return null;
  }

  // reset, disable, enable
  if (!self) {
    if (tRole === 'owner' && cRole !== 'owner') return 'Only an Owner can manage an Owner';
    if (tRole === 'admin' && cRole !== 'owner') return 'Admins can only manage Users';
  }
  if (action === 'disable' && tRole === 'owner' && opts.ownerCount <= 1) return 'Cannot disable the last remaining Owner';
  return null;
}

module.exports = { check };

/*
 * Shared auth for every page. Load after /assets/vendor/supabase.js.
 *   <script src="/assets/auth.js" data-page="protected"></script>   (default)
 *   <script src="/assets/auth.js" data-page="public"></script>      (login, reset)
 * Optional on <body>: data-roles="owner,admin"  or  data-tool="<id from tools.json>"
 *
 * This is a client-side gate. It hides pages from people who are not signed in,
 * but static files are not a security boundary: real data must come from /api
 * routes or RLS-protected tables.
 */
(function () {
  var script = document.currentScript;
  var isPublic = script && script.getAttribute('data-page') === 'public';
  if (!isPublic) document.documentElement.style.visibility = 'hidden';

  var P = window.Platform = { sb: null, user: null, role: null, session: null, name: '', config: null };
  var readyResolve, readyReject;
  P.ready = new Promise(function (res, rej) { readyResolve = res; readyReject = rej; });

  function reveal() { document.documentElement.style.visibility = ''; }
  function toLogin() {
    var next = location.pathname + location.search;
    location.replace('/login.html' + (next && next !== '/' && next !== '/index.html' ? '?next=' + encodeURIComponent(next) : ''));
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  P.esc = esc;

  function loadConfig() {
    try {
      var cached = sessionStorage.getItem('platform_cfg');
      if (cached) return Promise.resolve(JSON.parse(cached));
    } catch (e) {}
    return fetch('/api/config', { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('Config unavailable');
      return r.json();
    }).then(function (cfg) {
      try { sessionStorage.setItem('platform_cfg', JSON.stringify(cfg)); } catch (e) {}
      return cfg;
    });
  }

  P.roleOf = function (user) {
    var r = user && user.app_metadata && user.app_metadata.role;
    return r === 'owner' || r === 'admin' || r === 'user' ? r : 'user';
  };
  P.isAdmin = function () { return P.role === 'owner' || P.role === 'admin'; };

  P.toolRoles = function (t) {
    if (t.adminOnly) return ['owner', 'admin'];
    return t.roles && t.roles.length ? t.roles : ['owner', 'admin', 'user'];
  };
  P.loadTools = function () {
    return fetch('/assets/tools.json', { cache: 'no-cache' }).then(function (r) { return r.json(); });
  };

  // Calls an /api route with the caller's access token.
  P.api = function (path, opts) {
    opts = opts || {};
    return P.sb.auth.getSession().then(function (s) {
      var token = s.data.session && s.data.session.access_token;
      return fetch(path, {
        method: opts.method || 'GET',
        headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) { var e = new Error(data.error || ('Request failed (' + r.status + ')')); e.status = r.status; throw e; }
        return data;
      });
    });
  };

  P.signOut = function () {
    return P.sb.auth.signOut().catch(function () {}).then(function () { location.replace('/login.html'); });
  };

  P.renderTopbar = function () {
    var bar = document.getElementById('topbar');
    if (!bar) { bar = document.createElement('header'); bar.id = 'topbar'; document.body.insertBefore(bar, document.body.firstChild); }
    var label = P.name || (P.user && P.user.email) || '';
    bar.innerHTML =
      '<a class="brand" href="/"><img src="/assets/logo.png" alt=""><span>413 Solution Tools</span></a>' +
      (P.isAdmin() ? '<a class="adminlink" href="/admin.html">Admin</a>' : '') +
      '<a class="who" href="/account.html" title="Your account">' + esc(label) + '</a>' +
      '<button type="button" id="signOutTop">Sign out</button>';
    document.getElementById('signOutTop').addEventListener('click', P.signOut);
  };

  function fail(msg) {
    reveal();
    document.body.innerHTML = '<div class="wrap"><div class="card"><h2>Could not load</h2><p class="muted">' + esc(msg) + '</p><p><a href="/login.html">Go to sign in</a></p></div></div>';
    readyReject(new Error(msg));
  }

  function boot() {
    loadConfig().then(function (cfg) {
      P.config = cfg;
      if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) throw new Error('Platform is not configured.');
      P.sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      if (isPublic) { readyResolve(P); return null; }
      return P.sb.auth.getSession().then(function (s) {
        var session = s.data.session;
        if (!session) {
          if (cfg.requireSignin) { toLogin(); return null; }
          P.role = 'user'; P.renderTopbar(); reveal(); readyResolve(P); return null;
        }
        // Confirm the session with the server (catches deleted or banned accounts).
        return P.sb.auth.getUser().then(function (u) {
          var banned = u.data && u.data.user && u.data.user.banned_until && new Date(u.data.user.banned_until) > new Date();
          if (u.error || !u.data.user || banned) { return P.sb.auth.signOut().catch(function () {}).then(toLogin).then(function () { return null; }); }
          P.session = session; P.user = u.data.user; P.role = P.roleOf(u.data.user);
          var onAccount = location.pathname === '/account.html';
          if (P.user.app_metadata && P.user.app_metadata.must_change_password && !onAccount) {
            location.replace('/account.html?temp=1'); return null;
          }
          return gateByRole().then(function (ok) {
            if (!ok) { location.replace('/'); return null; }
            return P.sb.from('profiles').select('full_name').eq('id', P.user.id).maybeSingle().then(function (r) {
              P.name = (r.data && r.data.full_name) || '';
            }, function () {}).then(function () {
              P.renderTopbar(); reveal(); readyResolve(P);
            });
          });
        });
      });
    }).catch(function (e) { fail(e.message || 'Unknown error'); });
  }

  function gateByRole() {
    var b = document.body;
    var roles = b.getAttribute('data-roles');
    if (roles) return Promise.resolve(roles.split(',').map(function (s) { return s.trim(); }).indexOf(P.role) !== -1);
    var toolId = b.getAttribute('data-tool');
    if (!toolId) return Promise.resolve(true);
    return P.loadTools().then(function (tools) {
      var t = tools.filter(function (x) { return x.id === toolId; })[0];
      return !!t && P.toolRoles(t).indexOf(P.role) !== -1;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

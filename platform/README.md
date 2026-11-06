# 413 Solution Tools Platform

One private site for every internal tool, behind one sign-in.
Static HTML/CSS/vanilla JS pages, Vercel serverless functions in `/api`, Supabase for auth and data.

This folder is the Vercel project root (`413-platform`, Root Directory = `platform`).
The rest of the `JCFrith/router` repo is the legacy route planner on GitHub Pages and is not part of this deployment.

## Layout

```
index.html            hub (served at /)
login.html            sign in, forgot password
reset.html            set a new password from a recovery or invite email
account.html          own profile and password
admin.html            user management (Admin, Owner)
tools/                one page per tool
  route-planner.html  migrated from jcfrith.github.io/router
  field-dashboard.html migrated from jcfrith.github.io/router/dashboard.html
  next-tool.html      coming-soon placeholder
assets/
  auth.js             shared gate, top bar, Platform.api() helper
  tools.json          the tool list the hub renders from
  topbar.css          brand variables + top bar (re-theme here)
  styles.css          platform page styles
  vendor/             supabase-js 2.39.7, Leaflet 1.9.4, SheetJS 0.18.5 (pinned copies, no CDN)
api/
  config.js           GET  public: Supabase URL, anon key, REQUIRE_SIGNIN
  me.js               GET/PUT own profile, POST {action:"password_changed"}
  admin/users.js      GET list, POST create
  admin/reset.js      POST temp password or recovery email
  admin/status.js     POST disable / enable
  admin/remove.js     POST hard delete (typed email confirmation)
  admin/role.js       POST change role (Owner only)
lib/                  server helpers shared by /api (not routes)
supabase/migrations/  SQL applied to the Supabase project
vercel.json           security headers, blocks /lib and /supabase from being served
```

## Environment variables (Vercel, Production and Preview)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (the publishable key)
- `SUPABASE_SERVICE_KEY` (server only; set it in the Vercel dashboard, never commit it)
- `REQUIRE_SIGNIN` (default `true`; ignored in production, where the gate is always on)

## Roles

Stored only in the Supabase auth user's `app_metadata.role`: `owner`, `admin`, `user`.
Users cannot edit `app_metadata`. Every `/api` route validates the bearer token with Supabase and reads the role from it.
Role changes take effect on the user's next sign-in.

| Role | Can do |
|---|---|
| Owner | Everything an Admin can, plus create Admins and change roles. Cannot be removed from the Admin page. The last Owner cannot be demoted or disabled. |
| Admin | Admin page. Add, disable, enable, remove and reset Users. Cannot touch Owners or other Admins. |
| User | Sign in, use permitted tools, edit own account. |

## Seeding the first Owner

1. Supabase dashboard > Authentication > Users > Add user > Create new user. Enter the email, a strong password, tick Auto Confirm User.
2. Supabase dashboard > SQL Editor, run:
   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"owner"}'::jsonb
   where email = 'owner@example.com';
   ```
3. Sign in at `/login.html`. If you were already signed in, sign out and back in so the new role is in your token.

The first Owner for this build is `chase@413solution.com` (set by `supabase/migrations/20261106_002_seed_roles.sql`).

## Supabase settings this depends on

- Authentication > Sign In / Providers > Allow new users to sign up: **off** (only admin-created accounts).
- Authentication > URL Configuration > Redirect URLs: add `https://<production-domain>/reset.html`.
- Email delivery: Supabase's built-in mailer is rate-limited and meant for testing. For reliable invite and recovery emails, configure custom SMTP.

## Adding a tool

1. Add an entry to `assets/tools.json`: `id`, `name`, `description`, `icon`, `path`, `roles` (or `"adminOnly": true`), `status` (`live` or `coming-soon`).
2. Copy `tools/next-tool.html` to `tools/<id>.html`, set `<body data-tool="<id>">`, build the tool.
3. Load data only through `/api` routes or RLS-protected tables. Page files are public to anyone with the URL.
4. Push to `main`.

## Security notes

- Page gating is client-side (`assets/auth.js`). There is no edge middleware in this build, so the HTML of any page can be fetched by URL. No page contains secrets or data; all data comes from RLS-protected tables or `/api` routes that verify the caller.
- RLS: `profiles` select/update own row only. `admin_audit_log` has no client policies; only the service role writes it.
- Temporary passwords: 16 characters from Node's `crypto.randomInt`, shown once, and the user is forced to the Account page to change it on first sign-in.

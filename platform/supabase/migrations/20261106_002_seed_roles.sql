-- ============================================================
-- 413 Platform: seed roles in app_metadata (single source of truth).
-- Spec section 6: the first Owner is set with SQL.
-- Users without a role are treated as 'user' by the platform.
-- ============================================================
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"owner"}'::jsonb
 where email = 'chase@413solution.com';

update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"user"}'::jsonb
 where email in ('shawn@413solution.com','schedule@413solution.com')
   and coalesce(raw_app_meta_data->>'role','') = '';

-- Application roles, in a table of their own.
--
-- Roles must not live on a row the user can edit (a `profiles.role` column) or
-- in a JWT claim: either one lets a user grant themselves admin by updating
-- their own record. A dedicated table with no write policy has no API path to
-- escalation at all — only the service role, which bypasses RLS, can grant.
--
-- The gap this closes: supabase/functions/jacky-proxy relays `/api/control`,
-- the engine's master on/off switch, and could only check that the caller was
-- signed in. `getClaims` returns the Postgres role (`authenticated`), not an
-- application one, so any signed-in user could pause the engine for everyone.

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Readable by its owner, so the UI can hide admin-only controls instead of
-- offering them and letting the click come back 403.
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Writes are denied to every non-service caller. RLS with no permissive policy
-- would already deny these, but this repo states its denials explicitly
-- (see the "Deny updates on ..." policies alongside), and an explicit policy
-- cannot be defeated by someone later adding a broad permissive one.
CREATE POLICY "Deny role inserts" ON public.user_roles
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "Deny role updates" ON public.user_roles
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny role deletes" ON public.user_roles
  FOR DELETE TO authenticated, anon USING (false);

-- SECURITY DEFINER so the check is not itself subject to user_roles' RLS: a
-- policy that called has_role() while has_role() read the policied table would
-- recurse. search_path is pinned so the body cannot be redirected by whatever
-- the caller happens to have set.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)
  TO authenticated, service_role;

-- Granting the first admin is deliberately a manual step. From the Supabase SQL
-- editor (which runs as service role):
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES ('<the-uuid-from-auth.users>', 'admin');

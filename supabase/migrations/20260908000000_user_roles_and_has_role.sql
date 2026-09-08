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

-- Writes are denied to every non-service caller.
--
-- RESTRICTIVE, not the default PERMISSIVE. Permissive policies compose with OR,
-- so a later `WITH CHECK (true)` added alongside these would simply be OR-ed in
-- and writes would open back up. Restrictive policies compose with AND, so
-- these keep holding whatever is added next to them. With no permissive write
-- policy at all, writes are already denied today — being restrictive is what
-- keeps that true tomorrow.
CREATE POLICY "Deny role inserts" ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "Deny role updates" ON public.user_roles
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny role deletes" ON public.user_roles
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- Asks only about the *calling* user: the subject is `auth.uid()`, read inside
-- the function, and the caller supplies only the role.
--
-- An earlier draft took the user id as a parameter, which made it an oracle:
-- the function is SECURITY DEFINER and executable by `authenticated`, so it
-- answers from outside the owner-only SELECT policy above, and any signed-in
-- user who knew (or guessed) another's UUID could ask whether that person is
-- an admin and so enumerate them. That was never a way past the
-- `/api/control` gate — the relay passed the subject it had already verified —
-- but it defeated the visibility rule this table exists to have. If a
-- cross-user check is ever genuinely needed, it belongs in a separate function
-- with its own trusted-caller rule, not in widening this one.
--
-- SECURITY DEFINER so the check is not itself subject to user_roles' RLS: a
-- policy that called has_role() while has_role() read the policied table would
-- recurse. search_path is pinned so the body cannot be redirected by whatever
-- the caller happens to have set; `auth.uid()` is schema-qualified so it
-- resolves regardless of that pin. An anonymous caller gets a NULL uid, which
-- matches no row, so the function denies rather than erroring.
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _role
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(public.app_role)
  TO authenticated, service_role;

-- Granting the first admin is deliberately a manual step. From the Supabase SQL
-- editor (which runs as service role):
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES ('<the-uuid-from-auth.users>', 'admin');

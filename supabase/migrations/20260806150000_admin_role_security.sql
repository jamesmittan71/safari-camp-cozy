-- Centralize all role changes behind an audited administrator-only RPC.
CREATE TABLE IF NOT EXISTS public.user_role_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  target_user_id uuid NOT NULL REFERENCES auth.users(id),
  role public.app_role NOT NULL,
  granted boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_role_audit_target_created_at_idx
  ON public.user_role_audit (target_user_id, created_at DESC);

ALTER TABLE public.user_role_audit ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_role_audit TO authenticated;
GRANT ALL ON public.user_role_audit TO service_role;

CREATE POLICY "user_role_audit_admin_select"
  ON public.user_role_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'administrator'));

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  target_user_id uuid,
  target_role public.app_role,
  grant_role boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  administrator_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'administrator') THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;

  IF grant_role THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, target_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    IF target_role = 'administrator' THEN
      SELECT count(*) INTO administrator_count
      FROM public.user_roles
      WHERE role = 'administrator';

      IF administrator_count <= 1
        AND EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = target_user_id AND role = 'administrator'
        ) THEN
        RAISE EXCEPTION 'Cannot remove the final administrator';
      END IF;
    END IF;

    DELETE FROM public.user_roles
    WHERE user_id = target_user_id AND role = target_role;
  END IF;

  INSERT INTO public.user_role_audit (actor_user_id, target_user_id, role, granted)
  VALUES (auth.uid(), target_user_id, target_role, grant_role);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean)
  TO authenticated;
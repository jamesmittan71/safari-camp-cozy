-- Feature 8: Audit and activity logging
-- Track critical changes to allocations, rooms, maintenance, and team members

CREATE TABLE IF NOT EXISTS public.activity_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     text NOT NULL,
  entity_id       uuid,
  action          text NOT NULL,
  actor_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name      text,
  summary         text NOT NULL,
  details         jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_created_at_idx
  ON public.activity_log (created_at DESC);

CREATE INDEX IF NOT EXISTS activity_log_entity_idx
  ON public.activity_log (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS activity_log_actor_idx
  ON public.activity_log (actor_user_id);

-- RLS
GRANT SELECT ON public.activity_log TO authenticated;
GRANT SELECT, INSERT ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_select"
  ON public.activity_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "activity_log_insert"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (true);

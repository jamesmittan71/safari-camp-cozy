-- Extend housekeeping_tasks with new columns required for Sprint 3
ALTER TABLE public.housekeeping_tasks
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS cleaning_notes TEXT,
  ADD COLUMN IF NOT EXISTS inspection_notes TEXT,
  ADD COLUMN IF NOT EXISTS inspected_by TEXT,
  ADD COLUMN IF NOT EXISTS date_assigned DATE,
  ADD COLUMN IF NOT EXISTS date_started DATE,
  ADD COLUMN IF NOT EXISTS date_completed DATE;

-- Housekeeping history — full audit log, never overwrite
CREATE TABLE IF NOT EXISTS public.housekeeping_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.housekeeping_tasks(id),
  room_id UUID REFERENCES public.rooms(id),
  previous_status TEXT,
  new_status TEXT NOT NULL,
  cleaner_id UUID REFERENCES public.team_members(id),
  cleaner_name TEXT,
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.housekeeping_history TO authenticated;
GRANT ALL ON public.housekeeping_history TO service_role;
ALTER TABLE public.housekeeping_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hk_history_select" ON public.housekeeping_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "hk_history_insert" ON public.housekeeping_history FOR INSERT TO authenticated WITH CHECK (true);

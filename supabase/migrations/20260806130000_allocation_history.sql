CREATE TABLE public.allocation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id UUID REFERENCES public.allocations(id),
  staff_id UUID REFERENCES public.team_members(id),
  staff_name TEXT,
  previous_room_id UUID REFERENCES public.rooms(id),
  previous_room_number TEXT,
  previous_bed TEXT,
  new_room_id UUID REFERENCES public.rooms(id),
  new_room_number TEXT,
  new_bed TEXT,
  action TEXT NOT NULL,
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.allocation_history TO authenticated;
GRANT ALL ON public.allocation_history TO service_role;
ALTER TABLE public.allocation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allocation_history_select" ON public.allocation_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "allocation_history_insert" ON public.allocation_history FOR INSERT TO authenticated WITH CHECK (true);

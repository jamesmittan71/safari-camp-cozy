-- Sprint 2: Complete staff management

-- Add missing columns to team_members
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS employment_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS date_joined DATE;

-- Unique employee number (null allowed, uniqueness only on non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS team_members_employee_number_unique
  ON public.team_members (employee_number)
  WHERE employee_number IS NOT NULL AND deleted_at IS NULL;

-- Staff allocation history (immutable log — never soft-deleted)
CREATE TABLE IF NOT EXISTS public.staff_allocation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  from_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  from_bed TEXT,
  to_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  to_bed TEXT,
  allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_alloc_hist_member
  ON public.staff_allocation_history (team_member_id, created_at DESC);

-- RLS for staff_allocation_history
GRANT SELECT, INSERT ON public.staff_allocation_history TO authenticated;
GRANT ALL ON public.staff_allocation_history TO service_role;
ALTER TABLE public.staff_allocation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_allocation_history_select"
  ON public.staff_allocation_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff_allocation_history_insert"
  ON public.staff_allocation_history FOR INSERT TO authenticated
  WITH CHECK (public.can_operate(auth.uid()));

-- Prevent deleting a team member who has an active allocation
CREATE OR REPLACE FUNCTION public.prevent_active_allocation_delete()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- On soft-delete (setting deleted_at), check for active allocations
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.allocations a
      WHERE (a.bed_a = OLD.id OR a.bed_b = OLD.id)
        AND a.deleted_at IS NULL
        AND a.status <> 'cancelled'
        AND a.arrival_date <= CURRENT_DATE
        AND a.departure_date > CURRENT_DATE
    ) THEN
      RAISE EXCEPTION 'Cannot remove a staff member with an active allocation. Remove the allocation first.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER team_members_no_active_alloc_delete
BEFORE UPDATE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.prevent_active_allocation_delete();

REVOKE ALL ON FUNCTION public.prevent_active_allocation_delete() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prevent_active_allocation_delete() TO authenticated;

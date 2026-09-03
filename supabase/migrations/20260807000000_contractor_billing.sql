-- Sprint 5: Add contractor and accommodation rate fields for billing

-- Add contractor and accommodation_rate fields to team_members
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS is_contractor BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accommodation_rate NUMERIC(10, 2);

-- Create index for filtering contractors
CREATE INDEX IF NOT EXISTS idx_team_members_is_contractor
  ON public.team_members (is_contractor, deleted_at);

-- Comment for clarity
COMMENT ON COLUMN public.team_members.is_contractor IS 'true for contractors, false for staff (default). Staff stay free, contractors are billed at accommodation_rate per night.';
COMMENT ON COLUMN public.team_members.accommodation_rate IS 'Fixed rate per night for contractor accommodation. Only used if is_contractor = true. NULL for staff.';

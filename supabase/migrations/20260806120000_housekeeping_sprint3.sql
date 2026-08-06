-- Sprint 3: Expand housekeeping_tasks and add housekeeping_history

-- 1. Add new columns to housekeeping_tasks
ALTER TABLE public.housekeeping_tasks
  ADD COLUMN IF NOT EXISTS priority        text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS date_assigned   date,
  ADD COLUMN IF NOT EXISTS inspection_notes text,
  ADD COLUMN IF NOT EXISTS inspected_by   uuid REFERENCES public.team_members(id);

-- 2. Housekeeping history – one row per status change, never overwritten
CREATE TABLE IF NOT EXISTS public.housekeeping_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid NOT NULL REFERENCES public.housekeeping_tasks(id),
  from_status     text,
  to_status       text NOT NULL,
  changed_by      uuid REFERENCES public.team_members(id),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS housekeeping_history_task_id_idx
  ON public.housekeeping_history (task_id, created_at DESC);

-- RLS
GRANT SELECT, INSERT ON public.housekeeping_history TO authenticated;
GRANT ALL ON public.housekeeping_history TO service_role;

ALTER TABLE public.housekeeping_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hk_history_select"
  ON public.housekeeping_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "hk_history_insert"
  ON public.housekeeping_history FOR INSERT TO authenticated
  WITH CHECK (public.can_operate(auth.uid()));

-- 3. Function: record history and sync room status automatically
CREATE OR REPLACE FUNCTION public.hk_task_after_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_room_status text;
BEGIN
  -- Record history when status changes
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.housekeeping_history (task_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);

    -- Sync accommodation (rooms) status
    CASE NEW.status
      WHEN 'dirty'         THEN v_room_status := 'cleaning_required';
      WHEN 'scheduled'     THEN v_room_status := 'cleaning_required';
      WHEN 'in_progress'   THEN v_room_status := 'cleaning_required';
      WHEN 'inspection'    THEN v_room_status := 'cleaning_required';
      WHEN 'clean'         THEN v_room_status := 'available';
      WHEN 'out_of_service' THEN v_room_status := 'out_of_service';
      ELSE v_room_status := NULL;
    END CASE;

    IF v_room_status IS NOT NULL THEN
      UPDATE public.rooms SET status = v_room_status WHERE id = NEW.room_id;
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS hk_task_status_sync ON public.housekeeping_tasks;
CREATE TRIGGER hk_task_status_sync
  AFTER UPDATE ON public.housekeeping_tasks
  FOR EACH ROW EXECUTE FUNCTION public.hk_task_after_update();

-- 4. Function: record history on insert
CREATE OR REPLACE FUNCTION public.hk_task_after_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.housekeeping_history (task_id, from_status, to_status)
  VALUES (NEW.id, NULL, NEW.status);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS hk_task_insert_history ON public.housekeeping_tasks;
CREATE TRIGGER hk_task_insert_history
  AFTER INSERT ON public.housekeeping_tasks
  FOR EACH ROW EXECUTE FUNCTION public.hk_task_after_insert();

REVOKE ALL ON FUNCTION public.hk_task_after_update() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.hk_task_after_insert() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hk_task_after_update() TO authenticated;
GRANT EXECUTE ON FUNCTION public.hk_task_after_insert() TO authenticated;

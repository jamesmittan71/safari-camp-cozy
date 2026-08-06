-- Sprint 4: Expand maintenance_reports and add maintenance_history

-- 1. Add new columns to maintenance_reports
ALTER TABLE public.maintenance_reports
  ADD COLUMN IF NOT EXISTS work_order_number text,
  ADD COLUMN IF NOT EXISTS category          text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS assigned_to       uuid REFERENCES public.team_members(id),
  ADD COLUMN IF NOT EXISTS target_date       date,
  ADD COLUMN IF NOT EXISTS completion_notes  text;

-- Generate a sequential work order number on insert if not supplied
CREATE SEQUENCE IF NOT EXISTS maintenance_wo_seq START 1000;

CREATE OR REPLACE FUNCTION public.maint_set_work_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
    NEW.work_order_number := 'WO-' || LPAD(nextval('maintenance_wo_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS maint_work_order_gen ON public.maintenance_reports;
CREATE TRIGGER maint_work_order_gen
  BEFORE INSERT ON public.maintenance_reports
  FOR EACH ROW EXECUTE FUNCTION public.maint_set_work_order();

-- 2. Maintenance history table
CREATE TABLE IF NOT EXISTS public.maintenance_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       uuid NOT NULL REFERENCES public.maintenance_reports(id),
  from_status     text,
  to_status       text NOT NULL,
  changed_by      uuid REFERENCES public.team_members(id),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maintenance_history_report_id_idx
  ON public.maintenance_history (report_id, created_at DESC);

-- RLS
GRANT SELECT, INSERT ON public.maintenance_history TO authenticated;
GRANT ALL ON public.maintenance_history TO service_role;
ALTER TABLE public.maintenance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maint_history_select"
  ON public.maintenance_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "maint_history_insert"
  ON public.maintenance_history FOR INSERT TO authenticated
  WITH CHECK (public.can_operate(auth.uid()));

-- 3. Trigger: record history + sync room status on every status change
CREATE OR REPLACE FUNCTION public.maint_after_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_room_status text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.maintenance_history (report_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);

    CASE NEW.status
      WHEN 'reported'    THEN v_room_status := 'out_of_service';
      WHEN 'assigned'    THEN v_room_status := 'out_of_service';
      WHEN 'in_progress' THEN v_room_status := 'out_of_service';
      WHEN 'waiting_for_parts' THEN v_room_status := 'out_of_service';
      WHEN 'inspection'  THEN v_room_status := 'out_of_service';
      WHEN 'completed'   THEN v_room_status := 'available';
      WHEN 'cancelled'   THEN v_room_status := 'available';
      ELSE v_room_status := NULL;
    END CASE;

    IF v_room_status IS NOT NULL THEN
      UPDATE public.rooms SET status = v_room_status WHERE id = NEW.room_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS maint_status_sync ON public.maintenance_reports;
CREATE TRIGGER maint_status_sync
  AFTER UPDATE ON public.maintenance_reports
  FOR EACH ROW EXECUTE FUNCTION public.maint_after_update();

-- 4. Trigger: record history on insert
CREATE OR REPLACE FUNCTION public.maint_after_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.maintenance_history (report_id, from_status, to_status)
  VALUES (NEW.id, NULL, NEW.status);

  -- Critical or high priority → out_of_service immediately
  IF NEW.priority IN ('critical', 'high') THEN
    UPDATE public.rooms SET status = 'out_of_service' WHERE id = NEW.room_id;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS maint_insert_history ON public.maintenance_reports;
CREATE TRIGGER maint_insert_history
  AFTER INSERT ON public.maintenance_reports
  FOR EACH ROW EXECUTE FUNCTION public.maint_after_insert();

REVOKE ALL ON FUNCTION public.maint_set_work_order() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.maint_after_update() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.maint_after_insert() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.maint_set_work_order() TO authenticated;
GRANT EXECUTE ON FUNCTION public.maint_after_update() TO authenticated;
GRANT EXECUTE ON FUNCTION public.maint_after_insert() TO authenticated;

-- ROLES
CREATE TYPE public.app_role AS ENUM ('administrator','manager','housekeeping','read_only');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.can_manage(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('administrator','manager'));
$$;

CREATE OR REPLACE FUNCTION public.can_operate(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('administrator','manager','housekeeping'));
$$;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- new user handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO user_count FROM public.profiles;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN user_count <= 1 THEN 'administrator'::public.app_role ELSE 'read_only'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CAMPS
CREATE TABLE public.camps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  location TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  room_type_id UUID REFERENCES public.room_types(id) ON DELETE SET NULL,
  room_number TEXT NOT NULL,
  bed_configuration TEXT NOT NULL DEFAULT 'twin',
  max_occupancy INT NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'available',
  maintenance_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number TEXT,
  name TEXT NOT NULL,
  surname TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  email TEXT,
  vehicle_registration TEXT,
  emergency_contact TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  arrival_date DATE NOT NULL,
  departure_date DATE NOT NULL,
  bed_a UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  bed_b UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  bed_a_name TEXT,
  bed_b_name TEXT,
  department TEXT,
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'booked',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'to_clean',
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.maintenance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  reported_by TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  completed_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- grants + rls + policies
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['camps','buildings','room_types','rooms','team_members','allocations','housekeeping_tasks','maintenance_reports'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE TRIGGER set_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;

  -- manager-level write access
  FOREACH t IN ARRAY ARRAY['camps','buildings','room_types','rooms','team_members','allocations'] LOOP
    EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_manage(auth.uid()))', t, t);
    EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (public.can_manage(auth.uid()))', t, t);
  END LOOP;

  -- updates: rooms also editable by housekeeping
  FOREACH t IN ARRAY ARRAY['camps','buildings','room_types','team_members','allocations'] LOOP
    EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()))', t, t);
  END LOOP;
  EXECUTE 'CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE TO authenticated USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()))';

  -- housekeeping + maintenance: operate-level full write
  FOREACH t IN ARRAY ARRAY['housekeeping_tasks','maintenance_reports'] LOOP
    EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_operate(auth.uid()))', t, t);
    EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()))', t, t);
    EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (public.can_manage(auth.uid()))', t, t);
  END LOOP;
END $$;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- prevent double booking
CREATE OR REPLACE FUNCTION public.prevent_double_booking()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.departure_date <= NEW.arrival_date THEN
    RAISE EXCEPTION 'Departure date must be after arrival date';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.allocations a
    WHERE a.room_id = NEW.room_id
      AND a.deleted_at IS NULL
      AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND a.status <> 'cancelled'
      AND NEW.arrival_date < a.departure_date
      AND a.arrival_date < NEW.departure_date
  ) THEN
    RAISE EXCEPTION 'This room is already booked for the selected dates';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER allocations_no_double_booking
BEFORE INSERT OR UPDATE ON public.allocations
FOR EACH ROW WHEN (NEW.deleted_at IS NULL) EXECUTE FUNCTION public.prevent_double_booking();

CREATE INDEX idx_rooms_building ON public.rooms(building_id);
CREATE INDEX idx_buildings_camp ON public.buildings(camp_id);
CREATE INDEX idx_alloc_room_dates ON public.allocations(room_id, arrival_date, departure_date);
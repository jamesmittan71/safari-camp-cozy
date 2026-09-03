export type CampRow = {
  id: string;
  name: string;
  code: string | null;
  location: string | null;
  description: string | null;
  status: string;
};

export type BuildingRow = {
  id: string;
  camp_id: string;
  name: string;
  description: string | null;
  status: string;
  camps?: { name: string } | null;
};

export type RoomTypeRow = {
  id: string;
  camp_id: string;
  name: string;
  description: string | null;
  camps?: { name: string } | null;
};

export type RoomRow = {
  id: string;
  building_id: string;
  room_type_id: string | null;
  room_number: string;
  bed_configuration: string;
  max_occupancy: number;
  status: string;
  maintenance_notes: string | null;
  setup_image_url: string | null;
  buildings?: { name: string; camps?: { name: string } | null } | null;
  room_types?: { name: string } | null;
};

export type TeamMemberRow = {
  id: string;
  employee_number: string | null;
  name: string;
  surname: string;
  department: string | null;
  position: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  vehicle_registration: string | null;
  emergency_contact: string | null;
  employment_status: string;
  date_joined: string | null;
  notes: string | null;
  is_contractor: boolean;
  accommodation_rate: number | null;
};

export type StaffAllocationHistoryRow = {
  id: string;
  team_member_id: string;
  from_room_id: string | null;
  from_bed: string | null;
  to_room_id: string | null;
  to_bed: string | null;
  allocation_date: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  from_room?: {
    room_number: string;
    buildings?: { name: string; camps?: { name: string } | null } | null;
  } | null;
  to_room?: {
    room_number: string;
    buildings?: { name: string; camps?: { name: string } | null } | null;
  } | null;
};

export type AllocationRow = {
  id: string;
  room_id: string;
  arrival_date: string;
  departure_date: string;
  bed_a: string | null;
  bed_b: string | null;
  bed_a_name: string | null;
  bed_b_name: string | null;
  department: string | null;
  comments: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  rooms?: {
    room_number: string;
    buildings?: { name: string; camps?: { name: string } | null } | null;
  } | null;
};

export type HousekeepingRow = {
  id: string;
  room_id: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  date_assigned: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  inspection_notes: string | null;
  inspected_by: string | null;
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
  rooms?: {
    room_number: string;
    buildings?: { name: string; camps?: { name: string } | null } | null;
  } | null;
  team_members?: { name: string; surname: string } | null;
};

export type HousekeepingHistoryRow = {
  id: string;
  task_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
};

export type MaintenanceRow = {
  id: string;
  room_id: string;
  work_order_number: string | null;
  category: string;
  reported_by: string | null;
  assigned_to: string | null;
  priority: string;
  description: string;
  status: string;
  target_date: string | null;
  completed_date: string | null;
  completion_notes: string | null;
  created_at: string;
  rooms?: {
    room_number: string;
    buildings?: { name: string; camps?: { name: string } | null } | null;
  } | null;
  reporter?: { name: string; surname: string } | null;
  technician?: { name: string; surname: string } | null;
};

export type MaintenanceHistoryRow = {
  id: string;
  report_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
};

export type ActivityLogRow = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  actor_user_id: string | null;
  actor_name: string | null;
  summary: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export type UserRoleRow = {
  id: string;
  user_id: string;
  role: string;
};

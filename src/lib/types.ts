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
  buildings?: { name: string; camps?: { name: string } | null } | null;
  room_types?: { name: string } | null;
};

export type TeamMemberRow = {
  id: string;
  employee_number: string | null;
  name: string;
  surname: string;
  department: string | null;
  phone: string | null;
  email: string | null;
  vehicle_registration: string | null;
  emergency_contact: string | null;
  notes: string | null;
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
  rooms?: {
    room_number: string;
    buildings?: { name: string; camps?: { name: string } | null } | null;
  } | null;
};

export type HousekeepingRow = {
  id: string;
  room_id: string;
  status: string;
  assigned_to: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  rooms?: {
    room_number: string;
    buildings?: { name: string; camps?: { name: string } | null } | null;
  } | null;
  team_members?: { name: string; surname: string } | null;
};

export type MaintenanceRow = {
  id: string;
  room_id: string;
  reported_by: string | null;
  priority: string;
  description: string;
  status: string;
  completed_date: string | null;
  created_at: string;
  rooms?: {
    room_number: string;
    buildings?: { name: string; camps?: { name: string } | null } | null;
  } | null;
  team_members?: { name: string; surname: string } | null;
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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Tbl =
  | "camps"
  | "buildings"
  | "room_types"
  | "rooms"
  | "team_members"
  | "allocations"
  | "housekeeping_tasks"
  | "housekeeping_history"
  | "maintenance_reports"
  | "maintenance_history"
  | "profiles"
  | "user_roles"
  | "staff_allocation_history";

type ListOptions = {
  refetchInterval?: number;
};

const SOFT_DELETE_TABLES: Tbl[] = [
  "camps",
  "buildings",
  "room_types",
  "rooms",
  "team_members",
  "allocations",
  "housekeeping_tasks",
  "maintenance_reports",
];

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

export function useList<T = Record<string, any>>(
  table: Tbl,
  select = "*",
  order = "created_at",
  options?: ListOptions,
) {
  return useQuery({
    queryKey: [table, select, order],
    queryFn: async () => {
      let q = db.from(table).select(select);
      if (SOFT_DELETE_TABLES.includes(table)) q = q.is("deleted_at", null);
      const { data, error } = await q.order(order, { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as T[];
    },
    ...(options?.refetchInterval !== undefined && { refetchInterval: options.refetchInterval }),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function useSave(table: Tbl, label = "Record") {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { id, ...rest } = values;
      const { error } = id
        ? await db.from(table).update(rest).eq("id", id)
        : await db.from(table).insert(rest);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidate();
      toast.success(`${label} saved`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSoftDelete(table: Tbl, label = "Record") {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidate();
      toast.success(`${label} deleted`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export const ROOM_STATUS = [
  { value: "available", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "cleaning_required", label: "Cleaning Required" },
  { value: "out_of_service", label: "Out of Service" },
];

export const ROOM_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  ROOM_STATUS.map((s) => [s.value, s.label]),
);

export const HK_STATUS = [
  { value: "dirty", label: "Dirty" },
  { value: "scheduled", label: "Cleaning Scheduled" },
  { value: "in_progress", label: "Cleaning In Progress" },
  { value: "inspection", label: "Inspection Required" },
  { value: "clean", label: "Clean" },
  { value: "out_of_service", label: "Out Of Service" },
];

export const HK_PRIORITY = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

export const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export const MAINT_STATUS = [
  { value: "reported", label: "Reported" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_for_parts", label: "Waiting For Parts" },
  { value: "inspection", label: "Inspection Required" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const MAINT_CATEGORIES = [
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "furniture", label: "Furniture" },
  { value: "hvac", label: "HVAC" },
  { value: "building", label: "Building" },
  { value: "painting", label: "Painting" },
  { value: "cleaning_equipment", label: "Cleaning Equipment" },
  { value: "safety", label: "Safety" },
  { value: "general", label: "General" },
  { value: "other", label: "Other" },
];

export const today = () => new Date().toISOString().slice(0, 10);

export const EMPLOYMENT_STATUS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on_leave", label: "On Leave" },
  { value: "terminated", label: "Terminated" },
];

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export function isActiveOn(
  a: { arrival_date: string; departure_date: string; status?: string },
  day: string,
) {
  return a.status !== "cancelled" && a.arrival_date <= day && a.departure_date > day;
}

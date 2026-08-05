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
  | "maintenance_reports"
  | "profiles"
  | "user_roles";

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
) {
  return useQuery({
    queryKey: [table, select],
    queryFn: async () => {
      let q = db.from(table).select(select);
      if (SOFT_DELETE_TABLES.includes(table)) q = q.is("deleted_at", null);
      const { data, error } = await q.order(order, { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as T[];
    },
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
  { value: "to_clean", label: "To Clean" },
  { value: "in_progress", label: "Cleaning Started" },
  { value: "complete", label: "Cleaning Complete" },
  { value: "ready", label: "Ready for Occupancy" },
];

export const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export const MAINT_STATUS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const today = () => new Date().toISOString().slice(0, 10);

export function isActiveOn(
  a: { arrival_date: string; departure_date: string; status?: string },
  day: string,
) {
  return a.status !== "cancelled" && a.arrival_date <= day && a.departure_date > day;
}

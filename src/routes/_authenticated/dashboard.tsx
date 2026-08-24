import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BedDouble,
  Building2,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  ClipboardList,
  Eye,
  LayoutDashboard,
  Plus,
  Sparkles,
  Tent,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { isActiveOn, today, useList, useSave } from "@/lib/data";
import type {
  AllocationRow,
  HousekeepingHistoryRow,
  HousekeepingRow,
  MaintenanceHistoryRow,
  MaintenanceRow,
  ProfileRow,
  RoomRow,
  StaffAllocationHistoryRow,
  TeamMemberRow,
} from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Ten of Cups Camp Manager" },
      {
        name: "description",
        content:
          "Live operations dashboard with occupancy, arrivals, departures, cleaning and maintenance.",
      },
      { property: "og:title", content: "Dashboard — Ten of Cups Camp Manager" },
      {
        property: "og:description",
        content: "Mission Control for accommodation operations across the reserve.",
      },
    ],
  }),
  component: Dashboard,
});

const REFRESH_MS = 60_000;
const OPEN_MAINTENANCE = new Set([
  "reported",
  "assigned",
  "in_progress",
  "waiting_for_parts",
  "inspection",
]);
const HK_ACTIVE = new Set(["dirty", "scheduled", "in_progress", "inspection"]);
const HK_TRANSITIONS: Record<string, Record<string, unknown>> = {
  dirty: { status: "scheduled" },
  scheduled: { status: "in_progress" },
  in_progress: { status: "inspection" },
  inspection: { status: "clean" },
};
const HK_LABELS: Record<string, string> = {
  dirty: "Schedule",
  scheduled: "Start Cleaning",
  in_progress: "Send to Inspection",
  inspection: "Mark Clean",
};
const MAINT_NEXT_STATUS: Record<string, string> = {
  reported: "assigned",
  assigned: "in_progress",
  in_progress: "inspection",
  waiting_for_parts: "in_progress",
  inspection: "completed",
};
const MAINT_NEXT_LABEL: Record<string, string> = {
  reported: "Assign",
  assigned: "Start Job",
  in_progress: "Send to Inspection",
  waiting_for_parts: "Resume",
  inspection: "Complete",
};
const PRIORITY_WEIGHT: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };

function isHousekeepingOverdue(task: HousekeepingRow, day: string) {
  if (!HK_ACTIVE.has(task.status)) return false;
  const assigned = task.date_assigned ?? task.created_at?.slice(0, 10);
  return !!assigned && assigned < day;
}

function isMaintenanceOverdue(report: MaintenanceRow, day: string) {
  return OPEN_MAINTENANCE.has(report.status) && !!report.target_date && report.target_date < day;
}

function occupiedSlots(allocation: AllocationRow) {
  let count = 0;
  if (allocation.bed_a || allocation.bed_a_name) count += 1;
  if (allocation.bed_b || allocation.bed_b_name) count += 1;
  return count;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function formatUser(value: string | null | undefined, fallback = "System") {
  return value?.trim() || fallback;
}

function Dashboard() {
  const day = today();
  const { canOperate } = useAuth();
  const [detail, setDetail] = useState<{
    title: string;
    rows: { label: string; value: ReactNode }[];
  } | null>(null);

  const { data: camps = [] } = useList("camps", "*", "name", { refetchInterval: REFRESH_MS });
  const { data: buildings = [] } = useList("buildings", "*, camps(name)", "name", {
    refetchInterval: REFRESH_MS,
  });
  const { data: rooms = [] } = useList<RoomRow>(
    "rooms",
    "*, buildings(name, camps(name)), room_types(name)",
    "room_number",
    { refetchInterval: REFRESH_MS },
  );
  const { data: allocations = [] } = useList<AllocationRow>(
    "allocations",
    "*, rooms(room_number, buildings(name, camps(name)))",
    "arrival_date",
    { refetchInterval: REFRESH_MS },
  );
  const { data: tasks = [] } = useList<HousekeepingRow>(
    "housekeeping_tasks",
    "*, rooms(room_number, buildings(name, camps(name))), team_members:team_members!housekeeping_tasks_assigned_to_fkey(name, surname)",
    "created_at",
    { refetchInterval: REFRESH_MS },
  );
  const { data: reports = [] } = useList<MaintenanceRow>(
    "maintenance_reports",
    "*, rooms(room_number, buildings(name, camps(name))), technician:team_members!maintenance_reports_assigned_to_fkey(name, surname)",
    "created_at",
    { refetchInterval: REFRESH_MS },
  );
  const { data: members = [] } = useList<TeamMemberRow>("team_members", "*", "surname", {
    refetchInterval: REFRESH_MS,
  });
  const { data: housekeepingHistory = [] } = useList<HousekeepingHistoryRow>(
    "housekeeping_history",
    "*",
    "created_at",
    { refetchInterval: REFRESH_MS },
  );
  const { data: maintenanceHistory = [] } = useList<MaintenanceHistoryRow>(
    "maintenance_history",
    "*",
    "created_at",
    { refetchInterval: REFRESH_MS },
  );
  const { data: allocationHistory = [] } = useList<StaffAllocationHistoryRow>(
    "staff_allocation_history",
    "*, from_room:from_room_id(room_number, buildings(name, camps(name))), to_room:to_room_id(room_number, buildings(name, camps(name)))",
    "created_at",
    { refetchInterval: REFRESH_MS },
  );
  const { data: profiles = [] } = useList<ProfileRow>("profiles", "*", "full_name", {
    refetchInterval: REFRESH_MS,
  });

  const saveAllocation = useSave("allocations", "Allocation");
  const saveRoom = useSave("rooms", "Tent");
  const saveTask = useSave("housekeeping_tasks", "Cleaning task");
  const saveMaintenance = useSave("maintenance_reports", "Work order");

  const profileMap = useMemo(
    () =>
      new Map(
        profiles.map((profile) => [
          profile.id,
          profile.full_name ?? profile.email ?? "Unknown user",
        ]),
      ),
    [profiles],
  );
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const reportMap = useMemo(() => new Map(reports.map((report) => [report.id, report])), [reports]);

  const activeAllocations = useMemo(
    () => allocations.filter((allocation) => isActiveOn(allocation, day)),
    [allocations, day],
  );

  const allocatedStaffIds = useMemo(() => {
    const ids = new Set<string>();
    for (const allocation of activeAllocations) {
      if (allocation.bed_a) ids.add(allocation.bed_a);
      if (allocation.bed_b) ids.add(allocation.bed_b);
    }
    return ids;
  }, [activeAllocations]);

  const totalBeds = useMemo(
    () => rooms.reduce((sum, room) => sum + Number(room.max_occupancy || 0), 0),
    [rooms],
  );
  const outOfServiceRooms = useMemo(
    () => rooms.filter((room) => room.status === "out_of_service"),
    [rooms],
  );
  const outOfServiceBeds = useMemo(
    () => outOfServiceRooms.reduce((sum, room) => sum + Number(room.max_occupancy || 0), 0),
    [outOfServiceRooms],
  );
  const occupiedBeds = useMemo(
    () => activeAllocations.reduce((sum, allocation) => sum + occupiedSlots(allocation), 0),
    [activeAllocations],
  );
  const serviceableBeds = Math.max(totalBeds - outOfServiceBeds, 0);
  const availableBeds = Math.max(serviceableBeds - occupiedBeds, 0);
  const occupancyPercent = serviceableBeds ? Math.round((occupiedBeds / serviceableBeds) * 100) : 0;

  const arrivalsToday = useMemo(
    () =>
      allocations.filter(
        (allocation) => allocation.arrival_date === day && allocation.status !== "cancelled",
      ),
    [allocations, day],
  );
  const departuresToday = useMemo(
    () =>
      allocations.filter(
        (allocation) => allocation.departure_date === day && allocation.status !== "cancelled",
      ),
    [allocations, day],
  );

  const housekeepingCounts = useMemo(
    () => ({
      dirty: tasks.filter((task) => task.status === "dirty").length,
      cleaning: tasks.filter((task) => task.status === "in_progress").length,
      inspection: tasks.filter((task) => task.status === "inspection").length,
      clean: tasks.filter((task) => task.status === "clean").length,
      completedToday: tasks.filter((task) => task.completed_at?.slice(0, 10) === day).length,
      overdue: tasks.filter((task) => isHousekeepingOverdue(task, day)).length,
      dirtyToday: tasks.filter((task) => {
        if (!["dirty", "scheduled"].includes(task.status)) return false;
        const assigned = task.date_assigned ?? task.created_at?.slice(0, 10);
        return assigned === day;
      }).length,
    }),
    [tasks, day],
  );

  const openMaintenance = useMemo(
    () => reports.filter((report) => OPEN_MAINTENANCE.has(report.status)),
    [reports],
  );
  const maintenanceCounts = useMemo(
    () => ({
      open: openMaintenance.length,
      critical: openMaintenance.filter((report) => report.priority === "critical").length,
      overdue: openMaintenance.filter((report) => isMaintenanceOverdue(report, day)).length,
      completedToday: reports.filter((report) => report.completed_date === day).length,
    }),
    [openMaintenance, reports, day],
  );

  const doubleAllocationErrors = useMemo(() => {
    const roomConflicts = new Map<string, number>();
    const occupantConflicts = new Map<string, number>();

    for (const allocation of activeAllocations) {
      roomConflicts.set(allocation.room_id, (roomConflicts.get(allocation.room_id) ?? 0) + 1);
      const occupants = [
        allocation.bed_a,
        allocation.bed_b,
        allocation.bed_a_name,
        allocation.bed_b_name,
      ].filter(Boolean);
      for (const occupant of occupants) {
        occupantConflicts.set(String(occupant), (occupantConflicts.get(String(occupant)) ?? 0) + 1);
      }
    }

    return {
      roomConflicts: [...roomConflicts.values()].filter((count) => count > 1).length,
      occupantConflicts: [...occupantConflicts.values()].filter((count) => count > 1).length,
    };
  }, [activeAllocations]);

  const attentionItems = useMemo(
    () =>
      [
        {
          key: "critical-maintenance",
          title: "Critical Maintenance",
          count: maintenanceCounts.critical,
          tone: "destructive" as const,
          detail: "Open critical work orders that need immediate attention.",
          priority: 0,
        },
        {
          key: "overdue-maintenance",
          title: "Overdue Maintenance",
          count: maintenanceCounts.overdue,
          tone: "warning" as const,
          detail: "Open maintenance work past target completion date.",
          priority: 1,
        },
        {
          key: "overdue-cleaning",
          title: "Overdue Cleaning",
          count: housekeepingCounts.overdue,
          tone: "warning" as const,
          detail: "Cleaning work still open from previous days.",
          priority: 2,
        },
        {
          key: "dirty-today",
          title: "Dirty Tents Required Today",
          count: housekeepingCounts.dirtyToday,
          tone: "accent" as const,
          detail: "Tents scheduled for cleaning today and still not complete.",
          priority: 3,
        },
        {
          key: "double-allocation",
          title: "Double Allocation Errors",
          count: doubleAllocationErrors.roomConflicts + doubleAllocationErrors.occupantConflicts,
          tone: "destructive" as const,
          detail: "Active room or occupant overlaps detected in live allocations.",
          priority: 4,
        },
        {
          key: "unallocated-staff",
          title: "Unallocated Staff",
          count: members.filter(
            (member) => member.employment_status === "active" && !allocatedStaffIds.has(member.id),
          ).length,
          tone: "muted" as const,
          detail: "Active staff members with no current tent allocation.",
          priority: 5,
        },
        {
          key: "out-of-service",
          title: "Out Of Service Tents",
          count: outOfServiceRooms.length,
          tone: "warning" as const,
          detail: "Tents unavailable for allocation right now.",
          priority: 6,
        },
      ].sort((a, b) => {
        if (a.count > 0 && b.count === 0) return -1;
        if (b.count > 0 && a.count === 0) return 1;
        return a.priority - b.priority;
      }),
    [
      allocatedStaffIds,
      doubleAllocationErrors,
      housekeepingCounts,
      maintenanceCounts,
      members,
      outOfServiceRooms.length,
    ],
  );

  const occupancyByCamp = useMemo(() => {
    const occupiedByRoom = new Map<string, number>();
    for (const allocation of activeAllocations) {
      occupiedByRoom.set(
        allocation.room_id,
        (occupiedByRoom.get(allocation.room_id) ?? 0) + occupiedSlots(allocation),
      );
    }

    const map = new Map<
      string,
      { id: string; camp: string; occupied: number; available: number; outOfService: number }
    >();
    for (const room of rooms) {
      const camp = room.buildings?.camps?.name ?? "Unassigned";
      const entry = map.get(camp) ?? { id: camp, camp, occupied: 0, available: 0, outOfService: 0 };
      const roomBeds = Number(room.max_occupancy || 0);
      const roomOccupied = Math.min(occupiedByRoom.get(room.id) ?? 0, roomBeds);
      if (room.status === "out_of_service") {
        entry.outOfService += roomBeds;
      } else {
        entry.occupied += roomOccupied;
        entry.available += Math.max(roomBeds - roomOccupied, 0);
      }
      map.set(camp, entry);
    }

    return [...map.values()]
      .map((entry) => {
        const liveBeds = entry.occupied + entry.available;
        return {
          ...entry,
          rate: liveBeds ? Math.round((entry.occupied / liveBeds) * 100) : 0,
        };
      })
      .sort((a, b) => b.rate - a.rate || a.camp.localeCompare(b.camp));
  }, [activeAllocations, rooms]);

  const activities = useMemo(() => {
    const items: {
      id: string;
      timestamp: string;
      user: string;
      action: string;
      tent: string;
      camp: string;
    }[] = [];

    for (const allocation of allocations) {
      if (allocation.created_at?.slice(0, 10) === day) {
        items.push({
          id: `allocation-created-${allocation.id}`,
          timestamp: allocation.created_at,
          user: formatUser(profileMap.get(allocation.created_by ?? "")),
          action:
            allocation.status === "checked_in" || allocation.arrival_date === day
              ? "Check In"
              : "Allocation",
          tent: allocation.rooms?.room_number ?? "—",
          camp: allocation.rooms?.buildings?.camps?.name ?? "—",
        });
      }
      if (allocation.status === "checked_out" && allocation.updated_at?.slice(0, 10) === day) {
        items.push({
          id: `allocation-updated-${allocation.id}`,
          timestamp: allocation.updated_at,
          user: formatUser(profileMap.get(allocation.created_by ?? "")),
          action: "Check Out",
          tent: allocation.rooms?.room_number ?? "—",
          camp: allocation.rooms?.buildings?.camps?.name ?? "—",
        });
      }
    }

    for (const history of allocationHistory) {
      if (history.created_at?.slice(0, 10) !== day) continue;
      const room = history.to_room ?? history.from_room;
      items.push({
        id: `staff-history-${history.id}`,
        timestamp: history.created_at,
        user: formatUser(profileMap.get(history.created_by ?? "")),
        action: history.from_room_id && history.to_room_id ? "Transfer" : "Allocation",
        tent: room?.room_number ?? "—",
        camp: room?.buildings?.camps?.name ?? "—",
      });
    }

    for (const history of housekeepingHistory) {
      if (history.created_at?.slice(0, 10) !== day) continue;
      if (history.to_status !== "in_progress" && history.to_status !== "clean") continue;
      const task = taskMap.get(history.task_id);
      items.push({
        id: `housekeeping-${history.id}`,
        timestamp: history.created_at,
        user: formatUser(profileMap.get(history.changed_by ?? "")),
        action: history.to_status === "in_progress" ? "Cleaning Started" : "Cleaning Completed",
        tent: task?.rooms?.room_number ?? "—",
        camp: task?.rooms?.buildings?.camps?.name ?? "—",
      });
    }

    for (const report of reports) {
      if (report.created_at?.slice(0, 10) !== day) continue;
      items.push({
        id: `maintenance-report-${report.id}`,
        timestamp: report.created_at,
        user: report.reporter ? `${report.reporter.name} ${report.reporter.surname}` : "System",
        action: "Maintenance Reported",
        tent: report.rooms?.room_number ?? "—",
        camp: report.rooms?.buildings?.camps?.name ?? "—",
      });
    }

    for (const history of maintenanceHistory) {
      if (history.created_at?.slice(0, 10) !== day || history.to_status !== "completed") continue;
      const report = reportMap.get(history.report_id);
      items.push({
        id: `maintenance-history-${history.id}`,
        timestamp: history.created_at,
        user: formatUser(profileMap.get(history.changed_by ?? "")),
        action: "Maintenance Completed",
        tent: report?.rooms?.room_number ?? "—",
        camp: report?.rooms?.buildings?.camps?.name ?? "—",
      });
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [
    allocationHistory,
    allocations,
    day,
    housekeepingHistory,
    profileMap,
    reportMap,
    reports,
    maintenanceHistory,
    taskMap,
  ]);

  const cleaningQueue = useMemo(
    () =>
      [...tasks]
        .filter((task) => HK_ACTIVE.has(task.status))
        .sort((a, b) => {
          const overdueDiff =
            Number(isHousekeepingOverdue(b, day)) - Number(isHousekeepingOverdue(a, day));
          if (overdueDiff) return overdueDiff;
          return (PRIORITY_WEIGHT[a.priority] ?? 9) - (PRIORITY_WEIGHT[b.priority] ?? 9);
        }),
    [tasks, day],
  );

  const maintenanceQueue = useMemo(
    () =>
      [...openMaintenance].sort((a, b) => {
        const priorityDiff =
          (PRIORITY_WEIGHT[a.priority] ?? 9) - (PRIORITY_WEIGHT[b.priority] ?? 9);
        if (priorityDiff) return priorityDiff;
        return Number(isMaintenanceOverdue(b, day)) - Number(isMaintenanceOverdue(a, day));
      }),
    [openMaintenance, day],
  );

  const completeArrival = (allocation: AllocationRow) => {
    saveAllocation.mutate({ id: allocation.id, status: "checked_in" });
  };

  const completeDeparture = (allocation: AllocationRow) => {
    saveAllocation.mutate({ id: allocation.id, status: "checked_out" });
    if (allocation.room_id) {
      saveRoom.mutate({ id: allocation.room_id, status: "cleaning_required" });
    }
  };

  const completeCleaning = (task: HousekeepingRow) => {
    const nextPatch = HK_TRANSITIONS[task.status];
    if (!nextPatch) return;
    const now = new Date().toISOString();
    const patch =
      task.status === "dirty"
        ? { ...nextPatch, date_assigned: day }
        : task.status === "scheduled"
          ? { ...nextPatch, started_at: now }
          : task.status === "in_progress"
            ? { ...nextPatch, completed_at: now }
            : nextPatch;

    saveTask.mutate({ id: task.id, ...patch });
    if (task.status === "inspection" && task.room_id) {
      saveRoom.mutate({ id: task.room_id, status: "available" });
    }
  };

  const completeMaintenance = (report: MaintenanceRow) => {
    const next = MAINT_NEXT_STATUS[report.status];
    if (!next) return;
    saveMaintenance.mutate({
      id: report.id,
      status: next,
      completed_date: next === "completed" ? day : report.completed_date,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Dashboard"
        subtitle={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        action={
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            Auto-refreshes every minute
          </span>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <KpiCard icon={Tent} label="Total Camps" value={camps.length} />
        <KpiCard icon={Building2} label="Total Blocks" value={buildings.length} />
        <KpiCard icon={LayoutDashboard} label="Total Tents" value={rooms.length} />
        <KpiCard icon={BedDouble} label="Total Beds" value={totalBeds} />
        <KpiCard
          icon={Users}
          label="Occupied Beds"
          value={occupiedBeds}
          tone="text-status-occupied"
        />
        <KpiCard
          icon={BedDouble}
          label="Available Beds"
          value={availableBeds}
          tone="text-status-available"
        />
        <KpiCard icon={ClipboardList} label="Occupancy %" value={`${occupancyPercent}%`} />
        <KpiCard
          icon={AlertTriangle}
          label="Dirty Tents"
          value={housekeepingCounts.dirty}
          tone="text-status-cleaning"
        />
        <KpiCard
          icon={Sparkles}
          label="Cleaning In Progress"
          value={housekeepingCounts.cleaning}
          tone="text-status-occupied"
        />
        <KpiCard
          icon={Eye}
          label="Inspection Required"
          value={housekeepingCounts.inspection}
          tone="text-status-maintenance"
        />
        <KpiCard icon={Wrench} label="Open Maintenance" value={maintenanceCounts.open} />
        <KpiCard
          icon={AlertTriangle}
          label="Critical Maintenance"
          value={maintenanceCounts.critical}
          tone="text-destructive"
        />
        <KpiCard
          icon={CalendarCheck}
          label="Today's Check-ins"
          value={arrivalsToday.length}
          tone="text-status-available"
        />
        <KpiCard
          icon={CalendarX}
          label="Today's Check-outs"
          value={departuresToday.length}
          tone="text-status-cleaning"
        />
        <KpiCard icon={Users} label="Staff Currently Allocated" value={allocatedStaffIds.size} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="shadow-lodge">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Attention Required</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {attentionItems.map((item) => (
              <AlertCard
                key={item.key}
                title={item.title}
                count={item.count}
                tone={item.tone}
                detail={item.detail}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-lodge">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Today's Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No operational activity recorded yet today.
              </p>
            ) : (
              <ul className="space-y-3">
                {activities.slice(0, 12).map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-14 text-xs font-medium text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.user}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Tent {activity.tent}</p>
                      <p>{activity.camp}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <QueuePanel title="Arrivals Today" empty="No arrivals scheduled today.">
          {arrivalsToday.slice(0, 6).map((allocation) => (
            <QueueItemCard
              key={allocation.id}
              title={`${allocation.bed_a_name ?? allocation.bed_b_name ?? "Unassigned guest"}`}
              subtitle={`${allocation.rooms?.buildings?.camps?.name ?? "—"} · ${allocation.rooms?.buildings?.name ?? "—"} · Tent ${allocation.rooms?.room_number ?? "—"}`}
              badge={
                <StatusBadge
                  value={allocation.status === "checked_in" ? "occupied" : allocation.status}
                />
              }
              meta={`Arrival ${formatDate(allocation.arrival_date)} · Departure ${formatDate(allocation.departure_date)}`}
              actions={
                <>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/allocations">Open Record</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDetail({
                        title: "Arrival details",
                        rows: [
                          { label: "Camp", value: allocation.rooms?.buildings?.camps?.name ?? "—" },
                          { label: "Block", value: allocation.rooms?.buildings?.name ?? "—" },
                          { label: "Tent", value: allocation.rooms?.room_number ?? "—" },
                          { label: "Bed A", value: allocation.bed_a_name ?? "—" },
                          { label: "Bed B", value: allocation.bed_b_name ?? "—" },
                          { label: "Status", value: <StatusBadge value={allocation.status} /> },
                          { label: "Comments", value: allocation.comments ?? "—" },
                        ],
                      })
                    }
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => completeArrival(allocation)}
                    disabled={!canOperate || allocation.status === "checked_in"}
                  >
                    Complete Task
                  </Button>
                </>
              }
            />
          ))}
        </QueuePanel>

        <QueuePanel title="Departures Today" empty="No departures scheduled today.">
          {departuresToday.slice(0, 6).map((allocation) => (
            <QueueItemCard
              key={allocation.id}
              title={`${allocation.bed_a_name ?? allocation.bed_b_name ?? "Unassigned guest"}`}
              subtitle={`${allocation.rooms?.buildings?.camps?.name ?? "—"} · ${allocation.rooms?.buildings?.name ?? "—"} · Tent ${allocation.rooms?.room_number ?? "—"}`}
              badge={<StatusBadge value={allocation.status} />}
              meta={`Departure ${formatDate(allocation.departure_date)}`}
              actions={
                <>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/allocations">Open Record</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDetail({
                        title: "Departure details",
                        rows: [
                          { label: "Camp", value: allocation.rooms?.buildings?.camps?.name ?? "—" },
                          { label: "Block", value: allocation.rooms?.buildings?.name ?? "—" },
                          { label: "Tent", value: allocation.rooms?.room_number ?? "—" },
                          { label: "Bed A", value: allocation.bed_a_name ?? "—" },
                          { label: "Bed B", value: allocation.bed_b_name ?? "—" },
                          { label: "Status", value: <StatusBadge value={allocation.status} /> },
                          { label: "Comments", value: allocation.comments ?? "—" },
                        ],
                      })
                    }
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => completeDeparture(allocation)}
                    disabled={!canOperate || allocation.status === "checked_out"}
                  >
                    Complete Task
                  </Button>
                </>
              }
            />
          ))}
        </QueuePanel>

        <QueuePanel title="Cleaning Today" empty="No cleaning work is currently queued.">
          {cleaningQueue.slice(0, 6).map((task) => (
            <QueueItemCard
              key={task.id}
              title={`${task.rooms?.buildings?.camps?.name ?? "—"} · Tent ${task.rooms?.room_number ?? "—"}`}
              subtitle={`${task.rooms?.buildings?.name ?? "—"} · ${task.team_members ? `${task.team_members.name} ${task.team_members.surname}` : "Unassigned cleaner"}`}
              badge={<StatusBadge value={task.status} />}
              meta={
                isHousekeepingOverdue(task, day)
                  ? "Overdue cleaning"
                  : `Assigned ${formatDate(task.date_assigned ?? task.created_at)}`
              }
              actions={
                <>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/housekeeping">Open Record</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDetail({
                        title: "Cleaning task details",
                        rows: [
                          { label: "Camp", value: task.rooms?.buildings?.camps?.name ?? "—" },
                          { label: "Block", value: task.rooms?.buildings?.name ?? "—" },
                          { label: "Tent", value: task.rooms?.room_number ?? "—" },
                          {
                            label: "Assigned Cleaner",
                            value: task.team_members
                              ? `${task.team_members.name} ${task.team_members.surname}`
                              : "—",
                          },
                          { label: "Status", value: <StatusBadge value={task.status} /> },
                          { label: "Priority", value: <StatusBadge value={task.priority} /> },
                          { label: "Notes", value: task.notes ?? "—" },
                        ],
                      })
                    }
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => completeCleaning(task)}
                    disabled={!canOperate || !HK_LABELS[task.status]}
                  >
                    Complete Task
                  </Button>
                </>
              }
            />
          ))}
        </QueuePanel>

        <QueuePanel
          title="Maintenance Today"
          empty="No open maintenance work requires action right now."
        >
          {maintenanceQueue.slice(0, 6).map((report) => (
            <QueueItemCard
              key={report.id}
              title={`${report.rooms?.buildings?.camps?.name ?? "—"} · Tent ${report.rooms?.room_number ?? "—"}`}
              subtitle={`${report.rooms?.buildings?.name ?? "—"} · ${report.description}`}
              badge={<StatusBadge value={report.priority} />}
              meta={
                isMaintenanceOverdue(report, day)
                  ? "Overdue maintenance"
                  : `Target ${formatDate(report.target_date)}`
              }
              actions={
                <>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/maintenance">Open Record</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDetail({
                        title: "Maintenance details",
                        rows: [
                          { label: "Camp", value: report.rooms?.buildings?.camps?.name ?? "—" },
                          { label: "Block", value: report.rooms?.buildings?.name ?? "—" },
                          { label: "Tent", value: report.rooms?.room_number ?? "—" },
                          { label: "Priority", value: <StatusBadge value={report.priority} /> },
                          { label: "Status", value: <StatusBadge value={report.status} /> },
                          {
                            label: "Technician",
                            value: report.technician
                              ? `${report.technician.name} ${report.technician.surname}`
                              : "—",
                          },
                          { label: "Description", value: report.description },
                        ],
                      })
                    }
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => completeMaintenance(report)}
                    disabled={!canOperate || !MAINT_NEXT_LABEL[report.status]}
                  >
                    Complete Task
                  </Button>
                </>
              }
            />
          ))}
        </QueuePanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="shadow-lodge">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Occupancy Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {occupancyByCamp.map((camp) => (
              <div key={camp.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{camp.camp}</p>
                    <p className="text-xs text-muted-foreground">
                      Occupied {camp.occupied} · Available {camp.available} · Out Of Service{" "}
                      {camp.outOfService}
                    </p>
                  </div>
                  <p className="font-display text-2xl">{camp.rate}%</p>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className="flex h-full">
                    <div className="bg-status-occupied" style={{ width: `${camp.rate}%` }} />
                    <div
                      className="bg-status-maintenance/50"
                      style={{
                        width: `${camp.occupied + camp.available + camp.outOfService ? Math.round((camp.outOfService / (camp.occupied + camp.available + camp.outOfService)) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
          <Card className="shadow-lodge">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Housekeeping Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <SummaryStat
                label="Dirty"
                value={housekeepingCounts.dirty}
                tone="text-status-cleaning"
              />
              <SummaryStat
                label="Cleaning"
                value={housekeepingCounts.cleaning}
                tone="text-status-occupied"
              />
              <SummaryStat
                label="Inspection"
                value={housekeepingCounts.inspection}
                tone="text-status-maintenance"
              />
              <SummaryStat
                label="Clean"
                value={housekeepingCounts.clean}
                tone="text-status-available"
              />
              <SummaryStat
                label="Completed Today"
                value={housekeepingCounts.completedToday}
                tone="text-status-available"
              />
            </CardContent>
          </Card>

          <Card className="shadow-lodge">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Maintenance Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <SummaryStat label="Open Jobs" value={maintenanceCounts.open} />
              <SummaryStat
                label="Critical Jobs"
                value={maintenanceCounts.critical}
                tone="text-destructive"
              />
              <SummaryStat
                label="Overdue Jobs"
                value={maintenanceCounts.overdue}
                tone="text-destructive"
              />
              <SummaryStat
                label="Completed Today"
                value={maintenanceCounts.completedToday}
                tone="text-status-available"
              />
            </CardContent>
          </Card>

          <Card className="shadow-lodge">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <QuickAction to="/team" icon={Users} label="Allocate Staff" />
              <QuickAction to="/team" icon={Users} label="Move Staff" />
              <QuickAction to="/allocations" icon={CalendarCheck} label="Check In" />
              <QuickAction to="/allocations" icon={CalendarX} label="Check Out" />
              <QuickAction to="/maintenance" icon={Wrench} label="Report Maintenance" />
              <QuickAction to="/housekeeping" icon={Sparkles} label="Assign Cleaner" />
              <QuickAction to="/team" icon={UserPlus} label="Create Staff Member" />
              <QuickAction to="/rooms" icon={Plus} label="Create Tent" />
            </CardContent>
          </Card>
        </div>
      </section>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{detail?.title}</DialogTitle>
          </DialogHeader>
          <dl className="space-y-3 text-sm">
            {detail?.rows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 border-b border-border pb-3 last:border-0 last:pb-0 sm:grid-cols-[140px_1fr]"
              >
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone = "text-accent",
}: {
  icon: typeof Tent;
  label: string;
  value: number | string;
  tone?: string;
}) {
  return (
    <Card className="shadow-lodge">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs tracking-wide uppercase text-muted-foreground">{label}</p>
          <Icon className={`size-4 ${tone}`} />
        </div>
        <p className="mt-3 font-display text-3xl">{value}</p>
      </CardContent>
    </Card>
  );
}

function AlertCard({
  title,
  count,
  detail,
  tone,
}: {
  title: string;
  count: number;
  detail: string;
  tone: "destructive" | "warning" | "accent" | "muted";
}) {
  const toneClass =
    tone === "destructive"
      ? "border-destructive/30 bg-destructive/8"
      : tone === "warning"
        ? "border-status-maintenance/30 bg-status-maintenance/10"
        : tone === "accent"
          ? "border-status-cleaning/30 bg-status-cleaning/10"
          : "border-border bg-muted/30";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{title}</p>
        <p className="font-display text-3xl">{count}</p>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function QueuePanel({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode[] | ReactNode;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <Card className="shadow-lodge">
      <CardHeader>
        <CardTitle className="font-display text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : items}
      </CardContent>
    </Card>
  );
}

function QueueItemCard({
  title,
  subtitle,
  badge,
  meta,
  actions,
}: {
  title: string;
  subtitle: string;
  badge?: ReactNode;
  meta?: string;
  actions: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          {meta ? <p className="mt-1 text-xs text-muted-foreground">{meta}</p> : null}
        </div>
        {badge}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone = "text-foreground",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs tracking-wide uppercase text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-3xl ${tone}`}>{value}</p>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof Tent; label: string }) {
  return (
    <Button asChild variant="outline" className="justify-start">
      <Link to={to}>
        <Icon className="size-4" />
        {label}
      </Link>
    </Button>
  );
}

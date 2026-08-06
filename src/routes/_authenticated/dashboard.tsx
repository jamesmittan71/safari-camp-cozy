import { useMemo } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BedDouble, ClipboardList, Hammer, Tent } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { isActiveOn, today, useList } from "@/lib/data";
import type {
  AllocationRow,
  HousekeepingRow,
  MaintenanceRow,
  RoomRow,
  TeamMemberRow,
} from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Ten of Cups Camp Manager" },
      {
        name: "description",
        content: "Live camp occupancy, arrivals, departures, cleaning and maintenance overview.",
      },
      { property: "og:title", content: "Dashboard — Ten of Cups Camp Manager" },
      {
        property: "og:description",
        content: "Live occupancy and operations overview for the game farm.",
      },
    ],
  }),
  component: Dashboard,
});

type AllocationWithTime = AllocationRow & { created_at?: string };
type RoomWithTime = RoomRow & { created_at?: string };
type TeamMemberWithTime = TeamMemberRow & { created_at?: string };

type ActivityItem = {
  id: string;
  label: string;
  detail: string;
  when: string;
};

function Dashboard() {
  const day = today();

  const { data: tents = [] } = useList<RoomWithTime>("rooms", "*, buildings(name, camps(name))");
  const { data: allocations = [] } = useList<AllocationWithTime>(
    "allocations",
    "*, rooms(room_number, buildings(name, camps(name)))",
  );
  const { data: housekeeping = [] } = useList<HousekeepingRow>(
    "housekeeping_tasks",
    "*, rooms(room_number, buildings(name, camps(name))), team_members(name, surname)",
  );
  const { data: maintenance = [] } = useList<MaintenanceRow>(
    "maintenance_reports",
    "*, rooms(room_number, buildings(name, camps(name)))",
  );
  const { data: staff = [] } = useList<TeamMemberWithTime>("team_members", "*", "created_at");

  const activeAllocations = useMemo(
    () => allocations.filter((allocation) => isActiveOn(allocation, day)),
    [allocations, day],
  );

  const totalBeds = useMemo(
    () => tents.reduce((total, tent) => total + getBedCount(tent), 0),
    [tents],
  );
  const occupiedBeds = useMemo(
    () => activeAllocations.reduce((total, allocation) => total + getOccupancyCount(allocation), 0),
    [activeAllocations],
  );
  const availableBeds = Math.max(totalBeds - occupiedBeds, 0);
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const dirtyTentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tent of tents) {
      if (tent.status === "cleaning_required") ids.add(tent.id);
    }
    for (const task of housekeeping) {
      if (task.status === "to_clean" || task.status === "in_progress") ids.add(task.room_id);
    }
    return ids;
  }, [tents, housekeeping]);

  const activeMaintenance = useMemo(
    () => maintenance.filter((item) => item.status !== "completed" && item.status !== "cancelled"),
    [maintenance],
  );

  const recentAllocations = useMemo(
    () =>
      [...allocations]
        .sort((a, b) => sortNewest(a.created_at ?? a.arrival_date, b.created_at ?? b.arrival_date))
        .slice(0, 10),
    [allocations],
  );

  const cleaningInProgressCount = housekeeping.filter(
    (task) => task.status === "in_progress",
  ).length;
  const cleaningCompletedTodayCount = housekeeping.filter(
    (task) => task.completed_at?.slice(0, 10) === day,
  ).length;

  const maintenanceReportedCount = maintenance.filter((item) => item.status === "open").length;
  const maintenanceInProgressCount = maintenance.filter(
    (item) => item.status === "in_progress",
  ).length;
  const maintenanceCompletedTodayCount = maintenance.filter(
    (item) => item.completed_date?.slice(0, 10) === day,
  ).length;

  const todaysMovesCount = allocations.filter(
    (item) => item.arrival_date === day || item.departure_date === day,
  ).length;

  const staffOnSiteCount = useMemo(() => {
    const names = new Set<string>();
    for (const allocation of activeAllocations) {
      const bedA = allocation.bed_a_name?.trim();
      const bedB = allocation.bed_b_name?.trim();
      if (bedA) names.add(bedA.toLowerCase());
      if (bedB) names.add(bedB.toLowerCase());
    }
    return names.size > 0 ? names.size : occupiedBeds;
  }, [activeAllocations, occupiedBeds]);

  const newestAllocations = useMemo<ActivityItem[]>(
    () =>
      [...allocations]
        .sort((a, b) => sortNewest(a.created_at ?? a.arrival_date, b.created_at ?? b.arrival_date))
        .slice(0, 3)
        .map((item) => ({
          id: item.id,
          label: `Tent ${item.rooms?.room_number ?? "—"}`,
          detail:
            [item.bed_a_name, item.bed_b_name].filter(Boolean).join(" · ") || "No staff assigned",
          when: item.created_at ?? item.arrival_date,
        })),
    [allocations],
  );

  const cleaningUpdates = useMemo<ActivityItem[]>(
    () =>
      [...housekeeping]
        .sort((a, b) =>
          sortNewest(
            a.completed_at ?? a.started_at ?? a.created_at,
            b.completed_at ?? b.started_at ?? b.created_at,
          ),
        )
        .slice(0, 3)
        .map((item) => ({
          id: item.id,
          label: `Tent ${item.rooms?.room_number ?? "—"}`,
          detail: item.status.replace(/_/g, " "),
          when: item.completed_at ?? item.started_at ?? item.created_at,
        })),
    [housekeeping],
  );

  const maintenanceUpdates = useMemo<ActivityItem[]>(
    () =>
      [...maintenance]
        .sort((a, b) =>
          sortNewest(a.completed_date ?? a.created_at, b.completed_date ?? b.created_at),
        )
        .slice(0, 3)
        .map((item) => ({
          id: item.id,
          label: `Tent ${item.rooms?.room_number ?? "—"}`,
          detail: item.status.replace(/_/g, " "),
          when: item.completed_date ?? item.created_at,
        })),
    [maintenance],
  );

  const newestStaff = useMemo<ActivityItem[]>(
    () =>
      [...staff]
        .sort((a, b) => sortNewest(a.created_at, b.created_at))
        .slice(0, 3)
        .map((item) => ({
          id: item.id,
          label: `${item.name} ${item.surname}`,
          detail: item.department ?? "Department not set",
          when: item.created_at ?? "",
        })),
    [staff],
  );

  const newestTents = useMemo<ActivityItem[]>(
    () =>
      [...tents]
        .sort((a, b) => sortNewest(a.created_at, b.created_at))
        .slice(0, 3)
        .map((item) => ({
          id: item.id,
          label: `Tent ${item.room_number}`,
          detail: `${item.buildings?.name ?? "Unassigned"} · ${item.buildings?.camps?.name ?? "Unassigned"}`,
          when: item.created_at ?? "",
        })),
    [tents],
  );

  const campOccupancy = useMemo(
    () => getCampOccupancyByBeds(tents, activeAllocations),
    [tents, activeAllocations],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Dashboard"
        subtitle="Manager home screen for accommodation, housekeeping and maintenance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard icon={BedDouble} label="Occupancy %" value={occupancyPct} suffix="%" />
        <StatCard
          icon={Tent}
          label="Available Beds"
          value={availableBeds}
          tone="text-status-available"
        />
        <StatCard
          icon={ClipboardList}
          label="Dirty Rooms"
          value={dirtyTentIds.size}
          tone="text-status-cleaning"
        />
        <StatCard
          icon={Hammer}
          label="Maintenance"
          value={activeMaintenance.length}
          tone="text-status-maintenance"
        />
        <StatCard icon={ClipboardList} label="Today's Moves" value={todaysMovesCount} />
        <StatCard
          icon={ClipboardList}
          label="Today's Cleaning"
          value={cleaningCompletedTodayCount}
          tone="text-status-cleaning"
        />
        <StatCard
          icon={Hammer}
          label="Today's Maintenance"
          value={maintenanceCompletedTodayCount}
          tone="text-status-maintenance"
        />
        <StatCard icon={BedDouble} label="Staff On Site" value={staffOnSiteCount} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="shadow-lodge xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Staff Allocations</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/allocations">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-2">Staff</th>
                    <th className="py-2 pr-2">Tent</th>
                    <th className="py-2 pr-2">Camp</th>
                    <th className="py-2 pr-2">Allocated Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAllocations.length ? (
                    recentAllocations.map((allocation) => (
                      <tr key={allocation.id} className="border-t border-border/70 align-top">
                        <td className="py-2 pr-2">
                          {[allocation.bed_a_name, allocation.bed_b_name]
                            .filter(Boolean)
                            .join(" · ") || "Unassigned"}
                        </td>
                        <td className="py-2 pr-2">{allocation.rooms?.room_number ?? "—"}</td>
                        <td className="py-2 pr-2">
                          {allocation.rooms?.buildings?.camps?.name ?? "—"}
                        </td>
                        <td className="py-2 pr-2">
                          {fmtDate(allocation.created_at ?? allocation.arrival_date)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-3 text-muted-foreground">
                        No allocations yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lodge">
          <CardHeader>
            <CardTitle>Today's Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ActivityGroup title="Newest allocations" items={newestAllocations} />
            <ActivityGroup title="Cleaning updates" items={cleaningUpdates} />
            <ActivityGroup title="Maintenance updates" items={maintenanceUpdates} />
            <ActivityGroup title="Newest staff" items={newestStaff} />
            <ActivityGroup title="Newest tents" items={newestTents} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-lodge">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Housekeeping</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/housekeeping">Open</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <MiniStat label="Dirty Tents" value={dirtyTentIds.size} />
            <MiniStat label="Cleaning In Progress" value={cleaningInProgressCount} />
            <MiniStat label="Completed Today" value={cleaningCompletedTodayCount} />
          </CardContent>
        </Card>

        <Card className="shadow-lodge">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Maintenance</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/maintenance">Open</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <MiniStat label="Reported" value={maintenanceReportedCount} />
            <MiniStat label="In Progress" value={maintenanceInProgressCount} />
            <MiniStat label="Completed Today" value={maintenanceCompletedTodayCount} />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lodge">
        <CardHeader>
          <CardTitle>Occupancy by Camp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {campOccupancy.length ? (
            campOccupancy.map((camp) => (
              <div key={camp.camp} className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p className="font-medium">{camp.camp}</p>
                  <p className="text-muted-foreground">
                    {camp.occupiedBeds}/{camp.totalBeds} beds ({camp.percentage}%)
                  </p>
                </div>
                <Progress value={camp.percentage} />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No camps available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  suffix,
}: {
  icon: typeof Tent;
  label: string;
  value: number;
  tone?: string;
  suffix?: string;
}) {
  return (
    <div className="surface-lodge p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-wide uppercase text-muted-foreground">{label}</p>
        <Icon className={`size-4 ${tone ?? "text-accent"}`} />
      </div>
      <p className="mt-2 font-display text-3xl">
        {value}
        {suffix ?? ""}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}

function ActivityGroup({ title, items }: { title: string; items: ActivityItem[] }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <div className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-md border border-border/70 bg-background/50 p-2">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
              {item.when ? (
                <p className="text-xs text-muted-foreground">{fmtDate(item.when)}</p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No updates yet.</p>
        )}
      </div>
    </div>
  );
}

function getBedCount(room: RoomRow) {
  return room.bed_configuration === "single"
    ? 1
    : room.bed_configuration === "twin"
      ? 2
      : room.max_occupancy;
}

function getOccupancyCount(allocation: AllocationRow | undefined) {
  if (!allocation) return 0;

  const explicitBeds = [allocation.bed_a, allocation.bed_b].filter(Boolean).length;
  if (explicitBeds > 0) return explicitBeds;

  return [allocation.bed_a_name, allocation.bed_b_name].filter(Boolean).length;
}

function getCampOccupancyByBeds(rooms: RoomRow[], activeAllocations: AllocationRow[]) {
  const capacityByRoom = new Map<string, { camp: string; totalBeds: number }>();
  for (const room of rooms) {
    capacityByRoom.set(room.id, {
      camp: room.buildings?.camps?.name ?? "Unassigned",
      totalBeds: getBedCount(room),
    });
  }

  const map = new Map<string, { camp: string; totalBeds: number; occupiedBeds: number }>();

  for (const room of rooms) {
    const camp = room.buildings?.camps?.name ?? "Unassigned";
    const entry = map.get(camp) ?? { camp, totalBeds: 0, occupiedBeds: 0 };
    entry.totalBeds += getBedCount(room);
    map.set(camp, entry);
  }

  for (const allocation of activeAllocations) {
    const roomMeta = capacityByRoom.get(allocation.room_id);
    if (!roomMeta) continue;
    const entry = map.get(roomMeta.camp);
    if (!entry) continue;
    entry.occupiedBeds += getOccupancyCount(allocation);
  }

  return [...map.values()]
    .map((entry) => ({
      camp: entry.camp,
      totalBeds: entry.totalBeds,
      occupiedBeds: Math.min(entry.occupiedBeds, entry.totalBeds),
      percentage: entry.totalBeds ? Math.round((entry.occupiedBeds / entry.totalBeds) * 100) : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

function sortNewest(a?: string | null, b?: string | null) {
  return (b ?? "").localeCompare(a ?? "");
}

function fmtDate(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

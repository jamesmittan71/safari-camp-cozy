import { Link, createFileRoute } from "@tanstack/react-router";
import { BedDouble, Building2, ClipboardList, Sparkles, Tent, Wrench } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isActiveOn, today, useList } from "@/lib/data";
import type { AllocationRow, HousekeepingRow, MaintenanceRow, RoomRow } from "@/lib/types";

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

function Stat({
  icon: Icon,
  label,
  value,
  tone = "text-accent",
}: {
  icon: typeof Tent;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="surface-lodge p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-wide uppercase text-muted-foreground">{label}</p>
        <Icon className={`size-4 ${tone}`} />
      </div>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </div>
  );
}

function Dashboard() {
  const day = today();
  const { data: camps = [] } = useList("camps");
  const { data: buildings = [] } = useList("buildings");
  const { data: rooms = [] } = useList<RoomRow>("rooms", "*, buildings(name, camps(name))");
  const { data: allocations = [] } = useList<AllocationRow>(
    "allocations",
    "*, rooms(room_number, buildings(name, camps(name)))",
  );
  const { data: housekeepingTasks = [] } = useList<HousekeepingRow>(
    "housekeeping_tasks",
    "*, rooms(room_number, buildings(name)), team_members(name, surname)",
  );
  const { data: maintenanceIssues = [] } = useList<MaintenanceRow>(
    "maintenance_reports",
    "*, rooms(room_number, buildings(name))",
  );

  const activeAllocations = allocations.filter((allocation) => isActiveOn(allocation, day));
  const occupiedBeds = activeAllocations.reduce(
    (total, allocation) => total + getOccupancyCount(allocation),
    0,
  );
  const totalBedCapacity = rooms.reduce((total, room) => total + getBedCount(room), 0);
  const occupancyPercent =
    totalBedCapacity > 0 ? Math.round((occupiedBeds / totalBedCapacity) * 100) : 0;

  const dirtyRooms = new Set<string>();
  for (const room of rooms) {
    if (room.status === "cleaning_required") dirtyRooms.add(room.id);
  }
  for (const task of housekeepingTasks) {
    if (task.status === "to_clean" || task.status === "in_progress") {
      dirtyRooms.add(task.room_id);
    }
  }

  const recentAllocations = [...allocations]
    .sort((a, b) =>
      ((b as { created_at?: string }).created_at ?? "").localeCompare(
        (a as { created_at?: string }).created_at ?? "",
      ),
    )
    .slice(0, 5);

  const housekeepingDue = [...housekeepingTasks]
    .filter((task) => task.status !== "complete" && task.status !== "ready")
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 5);

  const maintenanceQueue = [...maintenanceIssues]
    .filter((issue) => issue.status !== "completed" && issue.status !== "cancelled")
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 5);
  const activeMaintenanceIssues = maintenanceIssues.filter(
    (issue) => issue.status !== "completed" && issue.status !== "cancelled",
  ).length;

  const todayChanges = [
    ...allocations
      .filter((allocation) => allocation.arrival_date === day || allocation.departure_date === day)
      .map((item) => ({
        id: item.id,
        type: "Allocation",
        title: item.rooms?.room_number ? `Tent ${item.rooms.room_number}` : "Allocation",
        detail:
          [item.bed_a_name, item.bed_b_name].filter(Boolean).join(" · ") ||
          "Bed assignment updated",
        created_at: item.arrival_date,
      })),
    ...housekeepingTasks
      .filter((task) => task.created_at?.slice(0, 10) === day)
      .map((item) => ({
        id: item.id,
        type: "Housekeeping",
        title: item.rooms?.room_number ? `Tent ${item.rooms.room_number}` : "Housekeeping",
        detail: item.notes ?? item.status.replace(/_/g, " "),
        created_at: item.created_at,
      })),
    ...maintenanceIssues
      .filter((issue) => issue.created_at?.slice(0, 10) === day)
      .map((item) => ({
        id: item.id,
        type: "Maintenance",
        title: item.rooms?.room_number ? `Tent ${item.rooms.room_number}` : "Maintenance",
        detail: item.description,
        created_at: item.created_at,
      })),
  ]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Operations Dashboard"
        subtitle={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Tent} label="Total Camps" value={camps.length} />
        <Stat icon={Building2} label="Total Blocks" value={buildings.length} />
        <Stat icon={BedDouble} label="Total Tents" value={rooms.length} />
        <Stat
          icon={BedDouble}
          label="Available Beds"
          value={Math.max(totalBedCapacity - occupiedBeds, 0)}
          tone="text-status-available"
        />
        <Stat
          icon={ClipboardList}
          label="Occupied Beds"
          value={occupiedBeds}
          tone="text-status-occupied"
        />
        <Stat
          icon={Sparkles}
          label="Occupancy %"
          value={occupancyPercent}
          tone="text-status-cleaning"
        />
        <Stat
          icon={Sparkles}
          label="Dirty Tents"
          value={dirtyRooms.size}
          tone="text-status-cleaning"
        />
        <Stat
          icon={Wrench}
          label="Maintenance Issues"
          value={activeMaintenanceIssues}
          tone="text-status-maintenance"
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card className="shadow-lodge">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Allocations</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/allocations">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAllocations.length ? (
              recentAllocations.map((allocation) => (
                <div
                  key={allocation.id}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 p-3"
                >
                  <div>
                    <p className="font-medium">{allocation.rooms?.room_number ?? "Tent"}</p>
                    <p className="text-sm text-muted-foreground">
                      {allocation.bed_a_name || allocation.bed_b_name
                        ? [allocation.bed_a_name, allocation.bed_b_name].filter(Boolean).join(" · ")
                        : "No staff assigned"}
                    </p>
                  </div>
                  <Badge variant="secondary">{allocation.arrival_date}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent allocations yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lodge">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Housekeeping Due</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/housekeeping">Open queue</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {housekeepingDue.length ? (
              housekeepingDue.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 p-3"
                >
                  <div>
                    <p className="font-medium">{task.rooms?.room_number ?? "Tent"}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {task.team_members
                      ? `${task.team_members.name} ${task.team_members.surname}`
                      : "Unassigned"}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Everything is looking tidy.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lodge">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Maintenance Queue</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/maintenance">Open queue</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {maintenanceQueue.length ? (
              maintenanceQueue.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 p-3"
                >
                  <div>
                    <p className="font-medium">{issue.rooms?.room_number ?? "Tent"}</p>
                    <p className="text-sm text-muted-foreground">{issue.description}</p>
                  </div>
                  <Badge variant="outline">{issue.priority}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No active maintenance issues.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lodge">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Today's Changes</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/accommodation-board">Open board</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayChanges.length ? (
              todayChanges.map((change) => (
                <div
                  key={change.id}
                  className="rounded-lg border border-border/70 bg-background/40 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{change.title}</p>
                    <Badge variant="secondary">{change.type}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{change.detail}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No changes logged today.</p>
            )}
          </CardContent>
        </Card>
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

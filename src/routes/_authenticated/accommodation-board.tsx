import { createFileRoute } from "@tanstack/react-router";
import { BedDouble, Sparkles, Wrench, Users } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isActiveOn, today, useList } from "@/lib/data";
import type { AllocationRow, HousekeepingRow, MaintenanceRow, RoomRow } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/accommodation-board")({
  head: () => ({
    meta: [
      { title: "Accommodation Board — Ten of Cups Camp Manager" },
      {
        name: "description",
        content: "A mobile-friendly view of current tent status, guests, cleaning and maintenance.",
      },
      { property: "og:title", content: "Accommodation Board — Ten of Cups Camp Manager" },
      {
        property: "og:description",
        content: "Track every tent in real time for the private safari camp.",
      },
    ],
  }),
  component: AccommodationBoardPage,
});

function AccommodationBoardPage() {
  const day = today();
  const { data: rooms = [] } = useList<RoomRow>(
    "rooms",
    "*, buildings(name, camps(name)), room_types(name)",
    "room_number",
  );
  const { data: allocations = [] } = useList<AllocationRow>(
    "allocations",
    "*, rooms(room_number, buildings(name, camps(name)))",
    "arrival_date",
  );
  const { data: cleaning = [] } = useList<HousekeepingRow>(
    "housekeeping_tasks",
    "*, rooms(room_number, buildings(name)), team_members(name, surname)",
  );
  const { data: maintenance = [] } = useList<MaintenanceRow>(
    "maintenance_reports",
    "*, rooms(room_number, buildings(name))",
  );

  const activeAllocations = allocations.filter((a) => isActiveOn(a, day));
  const activeByRoom = new Map(activeAllocations.map((a) => [a.room_id, a]));
  const cleaningByRoom = new Map(cleaning.map((task) => [task.room_id, task]));
  const maintenanceByRoom = new Map(
    maintenance
      .filter((report) => report.status !== "completed")
      .map((report) => [report.room_id, report]),
  );

  const summary = [
    {
      label: "Occupancy",
      value: `${rooms.length ? Math.round((activeAllocations.length / rooms.length) * 100) : 0}%`,
    },
    { label: "Occupied tents", value: `${activeAllocations.length}` },
    { label: "Cleaning", value: `${cleaning.filter((task) => task.status !== "ready").length}` },
    {
      label: "Maintenance",
      value: `${maintenance.filter((report) => report.status !== "completed").length}`,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accommodation Board"
        subtitle="A quick view of tent availability, active guests, housekeeping and maintenance across the camp."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label} className="shadow-lodge">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="font-display text-3xl">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => {
          const current = activeByRoom.get(room.id);
          const cleaningTask = cleaningByRoom.get(room.id);
          const maintenanceIssue = maintenanceByRoom.get(room.id);
          const guestNames =
            [current?.bed_a_name, current?.bed_b_name].filter(Boolean).join(" · ") || "Vacant";

          return (
            <Card key={room.id} className="shadow-lodge">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{room.room_number}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {room.buildings?.name ?? "Unassigned block"} ·{" "}
                      {room.buildings?.camps?.name ?? "Unassigned camp"}
                    </p>
                  </div>
                  <StatusBadge value={room.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{room.room_types?.name ?? "Tent type pending"}</Badge>
                  <Badge variant="outline">
                    {room.bed_configuration === "single"
                      ? "Single"
                      : room.bed_configuration === "twin"
                        ? "Twin"
                        : "Flexible"}
                  </Badge>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="size-4" />
                    <span>Current occupant</span>
                  </div>
                  <p className="mt-1 font-medium">{guestNames}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Sparkles className="size-4" />
                      <span>Housekeeping</span>
                    </div>
                    <p className="mt-1 font-medium">
                      {cleaningTask ? cleaningTask.status.replace(/_/g, " ") : "No task"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Wrench className="size-4" />
                      <span>Maintenance</span>
                    </div>
                    <p className="mt-1 font-medium">
                      {maintenanceIssue ? maintenanceIssue.description : "Clear"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <BedDouble className="size-4" />
                  <span>Capacity {room.max_occupancy}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

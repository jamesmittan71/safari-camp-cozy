import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isActiveOn, today, useList } from "@/lib/data";
import type { AllocationRow, HousekeepingRow, MaintenanceRow, RoomRow } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Ten of Cups Camp Manager" },
      {
        name: "description",
        content:
          "Occupancy, room history, cleaning, maintenance, current guests and availability reports.",
      },
      { property: "og:title", content: "Reports — Ten of Cups Camp Manager" },
      { property: "og:description", content: "Operational reporting across the game farm camps." },
    ],
  }),
  component: ReportsPage,
});

const TABS = [
  { key: "occupancy", label: "Occupancy" },
  { key: "guests", label: "Current Guests" },
  { key: "available", label: "Available Rooms" },
  { key: "history", label: "Room History" },
  { key: "cleaning", label: "Cleaning" },
  { key: "maintenance", label: "Maintenance" },
];

function ReportsPage() {
  const [tab, setTab] = useState("occupancy");
  const day = today();

  const { data: rooms = [] } = useList<RoomRow>(
    "rooms",
    "*, buildings(name, camps(name))",
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

  const active = useMemo(() => allocations.filter((a) => isActiveOn(a, day)), [allocations, day]);
  const occupiedIds = new Set(active.map((a) => a.room_id));
  const rate = rooms.length ? Math.round((occupiedIds.size / rooms.length) * 100) : 0;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Live operational reporting across every camp." />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? "default" : "outline"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "occupancy" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Occupancy rate" value={`${rate}%`} />
            <Stat label="Rooms occupied" value={String(occupiedIds.size)} />
            <Stat label="Total rooms" value={String(rooms.length)} />
          </div>
          <Card className="shadow-lodge">
            <CardHeader>
              <CardTitle className="font-display text-xl">Occupancy by camp</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                rows={byCamp(rooms, occupiedIds)}
                empty="No camps yet."
                columns={[
                  { key: "camp", label: "Camp" },
                  { key: "total", label: "Rooms" },
                  { key: "occupied", label: "Occupied" },
                  { key: "available", label: "Available" },
                  { key: "rate", label: "Rate" },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "guests" && (
        <DataTable<AllocationRow>
          rows={active}
          empty="Nobody is in camp today."
          columns={[
            { key: "room", label: "Room", render: (r) => r.rooms?.room_number ?? "—" },
            { key: "camp", label: "Camp", render: (r) => r.rooms?.buildings?.camps?.name ?? "—" },
            { key: "bed_a_name", label: "Bed A" },
            { key: "bed_b_name", label: "Bed B" },
            { key: "department", label: "Department" },
            { key: "arrival_date", label: "Arrival" },
            { key: "departure_date", label: "Departure" },
          ]}
        />
      )}

      {tab === "available" && (
        <DataTable<RoomRow>
          rows={rooms.filter((r) => r.status === "available" && !occupiedIds.has(r.id))}
          empty="No rooms currently available."
          columns={[
            { key: "room_number", label: "Room" },
            { key: "building", label: "Building", render: (r) => r.buildings?.name ?? "—" },
            { key: "camp", label: "Camp", render: (r) => r.buildings?.camps?.name ?? "—" },
            { key: "max_occupancy", label: "Sleeps" },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          ]}
        />
      )}

      {tab === "history" && (
        <DataTable<AllocationRow>
          rows={allocations}
          empty="No allocation history."
          columns={[
            { key: "room", label: "Room", render: (r) => r.rooms?.room_number ?? "—" },
            { key: "arrival_date", label: "Arrival" },
            { key: "departure_date", label: "Departure" },
            { key: "bed_a_name", label: "Bed A" },
            { key: "bed_b_name", label: "Bed B" },
            { key: "department", label: "Department" },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          ]}
        />
      )}

      {tab === "cleaning" && (
        <DataTable<HousekeepingRow>
          rows={cleaning}
          empty="No cleaning history."
          columns={[
            { key: "room", label: "Room", render: (r) => r.rooms?.room_number ?? "—" },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
            {
              key: "assigned",
              label: "Cleaned by",
              render: (r) =>
                r.team_members ? `${r.team_members.name} ${r.team_members.surname}` : "—",
            },
            { key: "started_at", label: "Started", render: (r) => dt(r.started_at) },
            { key: "completed_at", label: "Completed", render: (r) => dt(r.completed_at) },
            { key: "notes", label: "Notes" },
          ]}
        />
      )}

      {tab === "maintenance" && (
        <DataTable<MaintenanceRow>
          rows={maintenance}
          empty="No maintenance history."
          columns={[
            { key: "room", label: "Room", render: (r) => r.rooms?.room_number ?? "—" },
            {
              key: "priority",
              label: "Priority",
              render: (r) => <StatusBadge value={r.priority} />,
            },
            { key: "description", label: "Description" },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
            {
              key: "created_at",
              label: "Reported",
              render: (r) => new Date(r.created_at).toLocaleDateString(),
            },
            { key: "completed_date", label: "Completed", render: (r) => r.completed_date ?? "—" },
          ]}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-lodge">
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-display text-3xl">{value}</p>
      </CardContent>
    </Card>
  );
}

function dt(value: string | null) {
  return value
    ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";
}

function byCamp(rooms: RoomRow[], occupied: Set<string>) {
  const map = new Map<string, { id: string; camp: string; total: number; occupied: number }>();
  for (const room of rooms) {
    const camp = room.buildings?.camps?.name ?? "Unassigned";
    const entry = map.get(camp) ?? { id: camp, camp, total: 0, occupied: 0 };
    entry.total += 1;
    if (occupied.has(room.id)) entry.occupied += 1;
    map.set(camp, entry);
  }
  return [...map.values()].map((e) => ({
    ...e,
    available: e.total - e.occupied,
    rate: `${e.total ? Math.round((e.occupied / e.total) * 100) : 0}%`,
  }));
}

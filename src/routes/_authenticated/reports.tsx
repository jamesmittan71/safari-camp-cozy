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
      {
        property: "og:description",
        content: "Operational reporting across the game farm camps.",
      },
    ],
  }),
  component: ReportsPage,
});

const TABS = [
  { key: "occupancy", label: "Operational" },
  { key: "guests", label: "Current Guests" },
  { key: "available", label: "Available Rooms" },
  { key: "history", label: "Room History" },
  { key: "cleaning", label: "Cleaning" },
  { key: "maintenance", label: "Maintenance" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type ActivityRow = {
  id: string;
  activity: string;
  source: string;
  detail: string;
  when: string;
};

function ReportsPage() {
  const [tab, setTab] = useState<TabKey>("occupancy");
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
    "*, rooms(room_number, buildings(name, camps(name))), team_members(name, surname)",
  );
  const { data: maintenance = [] } = useList<MaintenanceRow>(
    "maintenance_reports",
    "*, rooms(room_number, buildings(name, camps(name)))",
  );

  const active = useMemo(() => allocations.filter((a) => isActiveOn(a, day)), [allocations, day]);
  const occupiedIds = useMemo(() => new Set(active.map((a) => a.room_id)), [active]);
  const rate = rooms.length ? Math.round((occupiedIds.size / rooms.length) * 100) : 0;

  const campRows = useMemo(() => byCamp(rooms, occupiedIds), [rooms, occupiedIds]);
  const blockRows = useMemo(() => byBlock(rooms, occupiedIds), [rooms, occupiedIds]);

  const totalBeds = useMemo(
    () => rooms.reduce((total, room) => total + getBedCount(room), 0),
    [rooms],
  );
  const occupiedBeds = useMemo(
    () => active.reduce((total, allocation) => total + getOccupancyCount(allocation), 0),
    [active],
  );
  const availableBeds = Math.max(totalBeds - occupiedBeds, 0);

  const dirtyTentCount = useMemo(() => {
    const dirtyRooms = new Set<string>();
    for (const room of rooms) {
      if (room.status === "cleaning_required") dirtyRooms.add(room.id);
    }
    for (const task of cleaning) {
      if (task.status === "to_clean" || task.status === "in_progress") dirtyRooms.add(task.room_id);
    }
    return dirtyRooms.size;
  }, [rooms, cleaning]);

  const openMaintenanceCount = useMemo(
    () =>
      maintenance.filter((item) => item.status !== "completed" && item.status !== "cancelled")
        .length,
    [maintenance],
  );

  const cleaningTouchedToday = useMemo(
    () =>
      cleaning.filter(
        (task) =>
          task.created_at.slice(0, 10) === day ||
          task.started_at?.slice(0, 10) === day ||
          task.completed_at?.slice(0, 10) === day,
      ),
    [cleaning, day],
  );

  const cleaningCompletedToday = useMemo(
    () => cleaning.filter((task) => task.completed_at?.slice(0, 10) === day).length,
    [cleaning, day],
  );

  const housekeepingCompletionPct =
    cleaningTouchedToday.length > 0
      ? Math.round((cleaningCompletedToday / cleaningTouchedToday.length) * 100)
      : 0;

  const housekeepingOpenCount = useMemo(
    () =>
      cleaning.filter((task) => task.status === "to_clean" || task.status === "in_progress").length,
    [cleaning],
  );

  const staffOnSiteCount = useMemo(() => {
    const names = new Set<string>();
    for (const allocation of active) {
      const bedA = allocation.bed_a_name?.trim();
      const bedB = allocation.bed_b_name?.trim();
      if (bedA) names.add(bedA.toLowerCase());
      if (bedB) names.add(bedB.toLowerCase());
    }
    return names.size > 0 ? names.size : occupiedBeds;
  }, [active, occupiedBeds]);

  const todaysActivity = useMemo<ActivityRow[]>(() => {
    const allocationsToday = allocations
      .filter(
        (row) =>
          (row as { created_at?: string }).created_at?.slice(0, 10) === day ||
          row.arrival_date === day ||
          row.departure_date === day,
      )
      .map((row) => ({
        id: `alloc-${row.id}`,
        activity: "Allocation",
        source: `Tent ${row.rooms?.room_number ?? "—"}`,
        detail: [row.bed_a_name, row.bed_b_name].filter(Boolean).join(" · ") || "No staff assigned",
        when: (row as { created_at?: string }).created_at ?? row.arrival_date,
      }));

    const cleaningToday = cleaning
      .filter(
        (row) =>
          row.created_at.slice(0, 10) === day ||
          row.started_at?.slice(0, 10) === day ||
          row.completed_at?.slice(0, 10) === day,
      )
      .map((row) => ({
        id: `clean-${row.id}`,
        activity: "Cleaning",
        source: `Tent ${row.rooms?.room_number ?? "—"}`,
        detail: row.status.replace(/_/g, " "),
        when: row.completed_at ?? row.started_at ?? row.created_at,
      }));

    const maintenanceToday = maintenance
      .filter(
        (row) => row.created_at.slice(0, 10) === day || row.completed_date?.slice(0, 10) === day,
      )
      .map((row) => ({
        id: `maint-${row.id}`,
        activity: "Maintenance",
        source: `Tent ${row.rooms?.room_number ?? "—"}`,
        detail: row.status.replace(/_/g, " "),
        when: row.completed_date ?? row.created_at,
      }));

    return [...allocationsToday, ...cleaningToday, ...maintenanceToday]
      .sort((a, b) => sortNewest(a.when, b.when))
      .slice(0, 20);
  }, [allocations, cleaning, maintenance, day]);

  const exportRows = useMemo<Record<string, string>[]>(() => {
    if (tab === "occupancy") {
      return blockRows.map((row) => ({
        camp: row.camp,
        block: row.block,
        tents: String(row.total),
        occupied_tents: String(row.occupied),
        available_tents: String(row.available),
        occupancy_rate: row.rate,
      }));
    }

    if (tab === "guests") {
      return active.map((row) => ({
        tent: row.rooms?.room_number ?? "",
        camp: row.rooms?.buildings?.camps?.name ?? "",
        bed_a: row.bed_a_name ?? "",
        bed_b: row.bed_b_name ?? "",
        department: row.department ?? "",
        arrival_date: row.arrival_date,
        departure_date: row.departure_date,
      }));
    }

    if (tab === "available") {
      return rooms
        .filter((room) => room.status === "available" && !occupiedIds.has(room.id))
        .map((row) => ({
          tent: row.room_number,
          block: row.buildings?.name ?? "",
          camp: row.buildings?.camps?.name ?? "",
          beds: String(getBedCount(row)),
          status: row.status,
        }));
    }

    if (tab === "history") {
      return allocations.map((row) => ({
        tent: row.rooms?.room_number ?? "",
        arrival_date: row.arrival_date,
        departure_date: row.departure_date,
        bed_a: row.bed_a_name ?? "",
        bed_b: row.bed_b_name ?? "",
        department: row.department ?? "",
        status: row.status,
      }));
    }

    if (tab === "cleaning") {
      return cleaning.map((row) => ({
        tent: row.rooms?.room_number ?? "",
        status: row.status,
        assigned_to: row.team_members ? `${row.team_members.name} ${row.team_members.surname}` : "",
        started_at: row.started_at ?? "",
        completed_at: row.completed_at ?? "",
        notes: row.notes ?? "",
      }));
    }

    return maintenance.map((row) => ({
      tent: row.rooms?.room_number ?? "",
      priority: row.priority,
      description: row.description,
      status: row.status,
      reported_at: row.created_at,
      completed_date: row.completed_date ?? "",
    }));
  }, [tab, blockRows, active, rooms, occupiedIds, allocations, cleaning, maintenance]);

  const exportCsv = () => {
    if (!exportRows.length) return;

    const columns = Object.keys(exportRows[0]);
    const header = columns.join(",");
    const lines = exportRows.map((row) =>
      columns
        .map((column) => {
          const value = row[column] ?? "";
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(","),
    );

    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `operational-reports-${tab}-${day}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!exportRows.length) return;

    const columns = Object.keys(exportRows[0]);
    const title = `Operational Report - ${TABS.find((item) => item.key === tab)?.label ?? tab}`;
    const tableHead = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
    const tableBody = exportRows
      .map((row) => {
        const cells = columns.map((column) => `<td>${escapeHtml(row[column] ?? "")}</td>`).join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;

    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: "Arial", sans-serif; margin: 24px; color: #1f2937; }
      h1 { margin: 0 0 8px; font-size: 20px; }
      p { margin: 0 0 18px; color: #4b5563; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f3f4f6; font-weight: 600; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>Generated ${escapeHtml(new Date().toLocaleString())}</p>
    <table>
      <thead><tr>${tableHead}</tr></thead>
      <tbody>${tableBody}</tbody>
    </table>
  </body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Operational reporting across camps, blocks, tents, housekeeping and maintenance."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportPdf} disabled={!exportRows.length}>
              Export PDF
            </Button>
            <Button onClick={exportCsv} disabled={!exportRows.length}>
              Export CSV
            </Button>
          </div>
        }
      />

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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Occupancy" value={`${rate}%`} />
            <Stat label="Staff" value={String(staffOnSiteCount)} />
            <Stat label="Housekeeping" value={String(housekeepingOpenCount)} />
            <Stat label="Maintenance" value={String(openMaintenanceCount)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="shadow-lodge">
              <CardHeader>
                <CardTitle className="font-display text-xl">Camp Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <MiniStat label="Camps" value={String(campRows.length)} />
                <MiniStat label="Available Beds" value={String(availableBeds)} />
                <MiniStat label="Dirty Rooms" value={String(dirtyTentCount)} />
                <MiniStat label="Housekeeping %" value={`${housekeepingCompletionPct}%`} />
              </CardContent>
            </Card>

            <Card className="shadow-lodge">
              <CardHeader>
                <CardTitle className="font-display text-xl">Block Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <MiniStat label="Blocks" value={String(blockRows.length)} />
                <MiniStat label="Occupied Beds" value={String(occupiedBeds)} />
                <MiniStat label="Today's Cleaning" value={String(cleaningCompletedToday)} />
                <MiniStat label="Today's Activity" value={String(todaysActivity.length)} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="shadow-lodge">
              <CardHeader>
                <CardTitle className="font-display text-xl">Camp Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  rows={campRows}
                  empty="No camps yet."
                  columns={[
                    { key: "camp", label: "Camp" },
                    { key: "total", label: "Tents" },
                    { key: "occupied", label: "Occupied" },
                    { key: "available", label: "Available" },
                    { key: "rate", label: "Rate" },
                  ]}
                />
              </CardContent>
            </Card>

            <Card className="shadow-lodge">
              <CardHeader>
                <CardTitle className="font-display text-xl">Block Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  rows={blockRows}
                  empty="No blocks yet."
                  columns={[
                    { key: "camp", label: "Camp" },
                    { key: "block", label: "Block" },
                    { key: "total", label: "Tents" },
                    { key: "occupied", label: "Occupied" },
                    { key: "available", label: "Available" },
                    { key: "rate", label: "Rate" },
                  ]}
                />
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lodge">
            <CardHeader>
              <CardTitle className="font-display text-xl">Today's Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable<ActivityRow>
                rows={todaysActivity}
                empty="No activity recorded today."
                columns={[
                  { key: "activity", label: "Activity" },
                  { key: "source", label: "Source" },
                  { key: "detail", label: "Details" },
                  { key: "when", label: "When", render: (row) => dt(row.when) },
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
            { key: "beds", label: "Beds", render: (r) => getBedCount(r) },
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

  return [...map.values()].map((entry) => ({
    ...entry,
    available: entry.total - entry.occupied,
    rate: `${entry.total ? Math.round((entry.occupied / entry.total) * 100) : 0}%`,
  }));
}

function byBlock(rooms: RoomRow[], occupied: Set<string>) {
  const map = new Map<
    string,
    { id: string; camp: string; block: string; total: number; occupied: number }
  >();
  for (const room of rooms) {
    const camp = room.buildings?.camps?.name ?? "Unassigned";
    const block = room.buildings?.name ?? "Unassigned";
    const id = `${camp}::${block}`;
    const entry = map.get(id) ?? { id, camp, block, total: 0, occupied: 0 };
    entry.total += 1;
    if (occupied.has(room.id)) entry.occupied += 1;
    map.set(id, entry);
  }

  return [...map.values()].map((entry) => ({
    ...entry,
    available: entry.total - entry.occupied,
    rate: `${entry.total ? Math.round((entry.occupied / entry.total) * 100) : 0}%`,
  }));
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

function sortNewest(a?: string | null, b?: string | null) {
  return (b ?? "").localeCompare(a ?? "");
}

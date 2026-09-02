import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isActiveOn, MAINT_STATUS, today, useList } from "@/lib/data";
import type {
  AllocationRow,
  HousekeepingRow,
  MaintenanceRow,
  RoomRow,
  TeamMemberRow,
} from "@/lib/types";

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
  { key: "daily-operations", label: "Daily Operations" },
  { key: "weekly-movements", label: "Weekly Movements" },
  { key: "open-maintenance", label: "Open Maintenance" },
];

const OPEN_MAINTENANCE_STATUSES = new Set(
  MAINT_STATUS.filter((status) => !["completed", "cancelled"].includes(status.value)).map(
    (status) => status.value,
  ),
);

function ReportsPage() {
  const [tab, setTab] = useState("occupancy");
  const day = today();
  const [reportDate, setReportDate] = useState(day);
  const [weekStart, setWeekStart] = useState(() => mondayOf(day));
  const [campFilter, setCampFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const { data: rooms = [], error: roomsError } = useList<RoomRow>(
    "rooms",
    "*, buildings(name, camps(name))",
    "room_number",
  );
  const { data: allocations = [], error: allocationsError } = useList<AllocationRow>(
    "allocations",
    "*, rooms(room_number, buildings(name, camps(name)))",
    "arrival_date",
  );
  const { data: cleaning = [], error: cleaningError } = useList<HousekeepingRow>(
    "housekeeping_tasks",
    "*, rooms(room_number, buildings(name, camps(name))), team_members:team_members!housekeeping_tasks_assigned_to_fkey(name, surname)",
  );
  const { data: maintenance = [], error: maintenanceError } = useList<MaintenanceRow>(
    "maintenance_reports",
    "*, rooms(room_number, buildings(name, camps(name))), technician:team_members!maintenance_reports_assigned_to_fkey(name, surname)",
  );
  const { data: staff = [], error: staffError } = useList<TeamMemberRow>(
    "team_members",
    "*",
    "surname",
  );

  const active = useMemo(() => allocations.filter((a) => isActiveOn(a, day)), [allocations, day]);
  const occupiedIds = new Set(active.map((a) => a.room_id));
  const rate = rooms.length ? Math.round((occupiedIds.size / rooms.length) * 100) : 0;
  const queryError =
    roomsError ?? allocationsError ?? cleaningError ?? maintenanceError ?? staffError;
  const dailyGuests = useMemo(
    () => allocations.filter((allocation) => isActiveOn(allocation, reportDate)),
    [allocations, reportDate],
  );
  const checkIns = useMemo(
    () => allocations.filter((allocation) => allocation.arrival_date === reportDate),
    [allocations, reportDate],
  );
  const checkOuts = useMemo(
    () => allocations.filter((allocation) => allocation.departure_date === reportDate),
    [allocations, reportDate],
  );
  const weekDays = useMemo(() => weekFrom(weekStart), [weekStart]);
  const movementRows = useMemo(
    () =>
      weekDays.map((date) => ({
        id: date,
        date,
        checkIns: allocations.filter((allocation) => allocation.arrival_date === date).length,
        checkOuts: allocations.filter((allocation) => allocation.departure_date === date).length,
        people: allocations
          .filter((allocation) => isActiveOn(allocation, date))
          .reduce((count, allocation) => count + occupiedBeds(allocation), 0),
      })),
    [allocations, weekDays],
  );
  const openMaintenance = useMemo(
    () =>
      maintenance.filter((report) => {
        if (!OPEN_MAINTENANCE_STATUSES.has(report.status)) return false;
        if (campFilter !== "all" && report.rooms?.buildings?.camps?.name !== campFilter)
          return false;
        if (priorityFilter !== "all" && report.priority !== priorityFilter) return false;
        if (technicianFilter !== "all" && report.assigned_to !== technicianFilter) return false;
        return !overdueOnly || isOverdue(report, reportDate);
      }),
    [campFilter, maintenance, overdueOnly, priorityFilter, reportDate, technicianFilter],
  );
  const camps = useMemo(
    () => [
      ...new Set(maintenance.map((report) => report.rooms?.buildings?.camps?.name).filter(Boolean)),
    ],
    [maintenance],
  );

  return (
    <div>
      <PageHeader title="Reports" subtitle="Live operational reporting across every camp." />

      {queryError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Unable to load report data</AlertTitle>
          <AlertDescription>{queryError.message}</AlertDescription>
        </Alert>
      ) : null}

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

      {tab === "daily-operations" && (
        <div className="space-y-6 print:space-y-4">
          <div className="flex items-end gap-3 print:hidden">
            <label className="grid gap-1 text-sm font-medium">
              Date
              <Input
                type="date"
                value={reportDate}
                onChange={(event) => setReportDate(event.target.value)}
              />
            </label>
            <Button variant="outline" onClick={() => window.print()}>
              Print report
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="People in camp"
              value={String(dailyGuests.reduce((sum, item) => sum + occupiedBeds(item), 0))}
            />
            <Stat label="Check-ins today" value={String(checkIns.length)} />
            <Stat label="Check-outs today" value={String(checkOuts.length)} />
          </div>
          <MovementTable title="Check-ins" rows={checkIns} empty="No arrivals scheduled." />
          <MovementTable title="Check-outs" rows={checkOuts} empty="No departures scheduled." />
        </div>
      )}

      {tab === "weekly-movements" && (
        <div className="space-y-6">
          <label className="grid w-fit gap-1 text-sm font-medium">
            Week starting Monday
            <Input
              type="date"
              value={weekStart}
              onChange={(event) => setWeekStart(mondayOf(event.target.value))}
            />
          </label>
          <DataTable
            rows={movementRows}
            empty="No movement data for this week."
            columns={[
              { key: "date", label: "Day", render: (row) => formatDay(row.date) },
              { key: "checkIns", label: "Check-ins" },
              { key: "checkOuts", label: "Check-outs" },
              { key: "people", label: "People in camp" },
            ]}
          />
        </div>
      )}

      {tab === "open-maintenance" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Select value={campFilter} onValueChange={setCampFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All camps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All camps</SelectItem>
                {camps.map((camp) => (
                  <SelectItem key={camp} value={camp!}>
                    {camp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {["low", "normal", "high", "critical"].map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All technicians" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All technicians</SelectItem>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} {member.surname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={overdueOnly ? "default" : "outline"}
              onClick={() => setOverdueOnly((current) => !current)}
            >
              Overdue only
            </Button>
          </div>
          <DataTable<MaintenanceRow>
            rows={openMaintenance}
            empty="No open maintenance issues match these filters."
            columns={[
              {
                key: "work_order_number",
                label: "WO #",
                render: (row) => row.work_order_number ?? "-",
              },
              {
                key: "camp",
                label: "Camp / Block / Tent",
                render: (row) =>
                  `${row.rooms?.buildings?.camps?.name ?? "-"} / ${row.rooms?.buildings?.name ?? "-"} / ${row.rooms?.room_number ?? "-"}`,
              },
              {
                key: "technician",
                label: "Technician",
                render: (row) =>
                  row.technician
                    ? `${row.technician.name} ${row.technician.surname}`
                    : "Unassigned",
              },
              {
                key: "priority",
                label: "Priority",
                render: (row) => <StatusBadge value={row.priority} />,
              },
              {
                key: "status",
                label: "Status",
                render: (row) => <StatusBadge value={row.status} />,
              },
              {
                key: "age",
                label: "Age",
                render: (row) => `${daysOld(row.created_at, reportDate)}d`,
              },
              { key: "target_date", label: "Target", render: (row) => row.target_date ?? "-" },
              {
                key: "overdue",
                label: "Overdue",
                render: (row) => (isOverdue(row, reportDate) ? "Yes" : "No"),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function MovementTable({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: AllocationRow[];
  empty: string;
}) {
  return (
    <Card className="shadow-lodge">
      <CardHeader>
        <CardTitle className="font-display text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable<AllocationRow>
          rows={rows}
          empty={empty}
          columns={[
            { key: "room", label: "Tent", render: (row) => row.rooms?.room_number ?? "-" },
            {
              key: "building",
              label: "Building",
              render: (row) => row.rooms?.buildings?.name ?? "-",
            },
            {
              key: "camp",
              label: "Camp",
              render: (row) => row.rooms?.buildings?.camps?.name ?? "-",
            },
            {
              key: "guests",
              label: "Guests",
              render: (row) => [row.bed_a_name, row.bed_b_name].filter(Boolean).join(", ") || "-",
            },
          ]}
        />
      </CardContent>
    </Card>
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

function occupiedBeds(allocation: AllocationRow) {
  return (
    Number(Boolean(allocation.bed_a || allocation.bed_a_name)) +
    Number(Boolean(allocation.bed_b || allocation.bed_b_name))
  );
}

function mondayOf(date: string) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() - ((value.getDay() + 6) % 7));
  return value.toISOString().slice(0, 10);
}

function weekFrom(monday: string) {
  return Array.from({ length: 7 }, (_, offset) => {
    const value = new Date(`${monday}T00:00:00`);
    value.setDate(value.getDate() + offset);
    return value.toISOString().slice(0, 10);
  });
}

function formatDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function daysOld(createdAt: string, date: string) {
  return Math.max(
    0,
    Math.floor(
      (new Date(`${date}T00:00:00`).getTime() - new Date(createdAt).getTime()) / 86_400_000,
    ),
  );
}

function isOverdue(report: MaintenanceRow, date: string) {
  return Boolean(report.target_date && report.target_date < date);
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

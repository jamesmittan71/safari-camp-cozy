import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Clock, History, Plus, User } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { RecordDialog, type RecordValues } from "@/components/RecordDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  HK_PRIORITY,
  HK_STATUS,
  today,
  useInsert,
  useList,
  useSave,
  useSoftDelete,
} from "@/lib/data";
import type {
  HousekeepingHistoryRow,
  HousekeepingRow,
  MaintenanceRow,
  RoomRow,
  TeamMemberRow,
} from "@/lib/types";

export const Route = createFileRoute("/_authenticated/housekeeping")({
  head: () => ({
    meta: [
      { title: "Housekeeping — Ten of Cups Camp Manager" },
      {
        name: "description",
        content: "Cleaning queue, progress tracking, history and housekeeping notes.",
      },
      { property: "og:title", content: "Housekeeping — Ten of Cups Camp Manager" },
      {
        property: "og:description",
        content: "Track tents from dirty through to clean and ready for occupancy.",
      },
    ],
  }),
  component: HousekeepingPage,
});

const SUMMARY_STATS = [
  { value: "dirty", label: "Dirty Tents" },
  { value: "cleaning_in_progress", label: "Cleaning In Progress" },
  { value: "inspection_required", label: "Inspection Required" },
  { value: "clean", label: "Clean Today" },
];

function HousekeepingPage() {
  const { canOperate } = useAuth();
  const day = today();

  const { data: tasks = [], isLoading } = useList<HousekeepingRow>(
    "housekeeping_tasks",
    "*, rooms(room_number, buildings(name, camps(name))), team_members(name, surname)",
  );
  const { data: rooms = [] } = useList<RoomRow>(
    "rooms",
    "*, buildings(name, camps(name))",
    "room_number",
  );
  const { data: staff = [] } = useList<TeamMemberRow>("team_members", "*", "surname");
  const { data: maintenance = [] } = useList<MaintenanceRow>(
    "maintenance_reports",
    "room_id, status",
  );

  const save = useSave("housekeeping_tasks", "Cleaning task");
  const saveRoom = useSave("rooms", "Room");
  const insertHistory = useInsert("housekeeping_history", "History");
  const remove = useSoftDelete("housekeeping_tasks", "Cleaning task");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecordValues | undefined>();
  const [historyTask, setHistoryTask] = useState<HousekeepingRow | null>(null);
  const [filterCamp, setFilterCamp] = useState("all");
  const [filterCleaner, setFilterCleaner] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterToday, setFilterToday] = useState(false);
  const [filterOverdue, setFilterOverdue] = useState(false);

  const { data: history = [] } = useList<HousekeepingHistoryRow>(
    "housekeeping_history",
    "*",
    "created_at",
  );

  // Rooms with active maintenance — cannot be marked Clean
  const activeMaintenanceRoomIds = new Set(
    maintenance
      .filter((m) => m.status === "open" || m.status === "in_progress")
      .map((m) => m.room_id),
  );

  const camps = Array.from(
    new Map(
      tasks
        .map((t) => t.rooms?.buildings?.camps)
        .filter(Boolean)
        .map((c) => [c!.name, c!]),
    ).values(),
  );

  const isOverdue = (t: HousekeepingRow) =>
    t.date_assigned !== null &&
    t.date_assigned < day &&
    t.status !== "clean" &&
    t.status !== "out_of_service";

  const filtered = tasks.filter((t) => {
    if (filterCamp !== "all" && t.rooms?.buildings?.camps?.name !== filterCamp) return false;
    if (filterCleaner !== "all" && t.assigned_to !== filterCleaner) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterToday && t.date_assigned !== day) return false;
    if (filterOverdue && !isOverdue(t)) return false;
    return true;
  });

  const counts = SUMMARY_STATS.map((s) => ({
    ...s,
    count:
      s.value === "clean"
        ? tasks.filter((t) => t.status === "clean" && t.date_completed === day).length
        : tasks.filter((t) => t.status === s.value).length,
  }));
  const overdueCount = tasks.filter(isOverdue).length;

  function transition(
    task: HousekeepingRow,
    newStatus: string,
    extraFields: Record<string, unknown> = {},
  ) {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { id: task.id, status: newStatus, ...extraFields };

    if (newStatus === "cleaning_in_progress") {
      updates.started_at = now;
      updates.date_started = day;
    }
    if (newStatus === "inspection_required") {
      updates.completed_at = now;
      updates.date_completed = day;
      updates.cleaning_notes = extraFields.cleaning_notes ?? task.cleaning_notes ?? null;
      // Update room board immediately
      saveRoom.mutate({ id: task.room_id, status: "cleaning_required" });
    }
    if (newStatus === "clean") {
      // Only allowed if no active maintenance
      if (activeMaintenanceRoomIds.has(task.room_id)) return;
      saveRoom.mutate({ id: task.room_id, status: "available" });
    }
    if (newStatus === "dirty") {
      saveRoom.mutate({ id: task.room_id, status: "cleaning_required" });
    }
    if (newStatus === "out_of_service") {
      saveRoom.mutate({ id: task.room_id, status: "out_of_service" });
    }

    save.mutate(updates);

    // Record history
    insertHistory.mutate({
      task_id: task.id,
      room_id: task.room_id,
      previous_status: task.status,
      new_status: newStatus,
      cleaner_id: task.assigned_to ?? null,
      cleaner_name: task.team_members
        ? `${task.team_members.name} ${task.team_members.surname}`
        : null,
      notes: (extraFields.cleaning_notes as string) ?? null,
    });
  }

  const taskHistory = historyTask ? history.filter((h) => h.task_id === historyTask.id) : [];

  return (
    <div>
      <PageHeader
        title="Housekeeping"
        subtitle="Daily cleaning queue — from dirty through to clean and ready for occupancy."
        action={
          canOperate ? (
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> New cleaning task
            </Button>
          ) : null
        }
      />

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {counts.map((c) => (
          <Card key={c.value} className="shadow-lodge">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="font-display text-3xl">{c.count}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="shadow-lodge">
          <CardContent className="pt-6">
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <AlertCircle className="size-3.5 text-destructive" /> Overdue
            </p>
            <p className="font-display text-3xl">{overdueCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={filterCamp} onValueChange={setFilterCamp}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Camp" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Camps</SelectItem>
            {camps.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCleaner} onValueChange={setFilterCleaner}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Cleaner" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Cleaners</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} {s.surname}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Statuses</SelectItem>
            {HK_STATUS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Priorities</SelectItem>
            {HK_PRIORITY.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={filterToday ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterToday((v) => !v)}
        >
          <Clock className="size-3.5" /> Today's Jobs
        </Button>

        <Button
          variant={filterOverdue ? "destructive" : "outline"}
          size="sm"
          onClick={() => setFilterOverdue((v) => !v)}
        >
          <AlertCircle className="size-3.5" /> Overdue
        </Button>
      </div>

      {/* Queue table */}
      <DataTable<HousekeepingRow>
        loading={isLoading}
        rows={filtered}
        empty="No cleaning tasks match the current filters."
        columns={[
          {
            key: "camp",
            label: "Camp",
            render: (r) => r.rooms?.buildings?.camps?.name ?? "—",
          },
          { key: "building", label: "Block", render: (r) => r.rooms?.buildings?.name ?? "—" },
          { key: "room", label: "Tent", render: (r) => r.rooms?.room_number ?? "—" },
          {
            key: "cleaner",
            label: "Cleaner",
            render: (r) =>
              r.team_members ? (
                <span className="flex items-center gap-1">
                  <User className="size-3.5 text-muted-foreground" />
                  {r.team_members.name} {r.team_members.surname}
                </span>
              ) : (
                <span className="text-muted-foreground">Unassigned</span>
              ),
          },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "priority", label: "Priority", render: (r) => <StatusBadge value={r.priority} /> },
          { key: "date_assigned", label: "Assigned", render: (r) => r.date_assigned ?? "—" },
          {
            key: "overdue",
            label: "Overdue",
            render: (r) =>
              isOverdue(r) ? (
                <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                  <AlertCircle className="size-3.5" /> Overdue
                </span>
              ) : null,
          },
        ]}
        actions={
          canOperate
            ? (r) => (
                <div className="flex flex-wrap gap-1">
                  {r.status === "dirty" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        save.mutate({ id: r.id, status: "cleaning_scheduled", date_assigned: day })
                      }
                    >
                      Schedule
                    </Button>
                  )}
                  {r.status === "cleaning_scheduled" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => transition(r, "cleaning_in_progress")}
                    >
                      Start
                    </Button>
                  )}
                  {r.status === "cleaning_in_progress" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => transition(r, "inspection_required")}
                    >
                      Complete
                    </Button>
                  )}
                  {r.status === "inspection_required" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => transition(r, "clean")}
                      disabled={activeMaintenanceRoomIds.has(r.room_id)}
                      title={
                        activeMaintenanceRoomIds.has(r.room_id)
                          ? "Active maintenance prevents marking clean"
                          : undefined
                      }
                    >
                      Mark Clean
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setHistoryTask(r)}>
                    <History className="size-3.5" />
                  </Button>
                </div>
              )
            : undefined
        }
        onEdit={
          canOperate
            ? (r) => {
                setEditing({ ...r } as RecordValues);
                setOpen(true);
              }
            : undefined
        }
        onDelete={canOperate ? (r) => remove.mutate(r.id) : undefined}
      />

      {/* New / Edit dialog */}
      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? "Edit cleaning task" : "New cleaning task"}
        initial={editing}
        submitting={save.isPending}
        fields={[
          {
            name: "room_id",
            label: "Tent / Room",
            type: "select",
            required: true,
            options: rooms.map((r) => ({
              value: r.id,
              label: `${r.room_number} — ${r.buildings?.name ?? ""} (${r.buildings?.camps?.name ?? ""})`,
            })),
          },
          { name: "status", label: "Cleaning Status", type: "select", options: HK_STATUS },
          { name: "priority", label: "Priority", type: "select", options: HK_PRIORITY },
          {
            name: "assigned_to",
            label: "Assigned Cleaner",
            type: "select",
            options: staff.map((s) => ({ value: s.id, label: `${s.name} ${s.surname}` })),
          },
          { name: "date_assigned", label: "Date Assigned", type: "date" },
          { name: "date_started", label: "Date Started", type: "date" },
          { name: "date_completed", label: "Date Completed", type: "date" },
          { name: "cleaning_notes", label: "Cleaning Notes", type: "textarea", full: true },
          { name: "inspection_notes", label: "Inspection Notes", type: "textarea", full: true },
          { name: "inspected_by", label: "Inspected By", type: "text" },
        ]}
        onSubmit={(values: RecordValues) =>
          save.mutate(
            {
              id: values.id,
              room_id: values.room_id,
              status: values.status ?? "dirty",
              priority: values.priority ?? "normal",
              assigned_to: values.assigned_to ?? null,
              date_assigned: values.date_assigned ?? null,
              date_started: values.date_started ?? null,
              date_completed: values.date_completed ?? null,
              cleaning_notes: values.cleaning_notes ?? null,
              inspection_notes: values.inspection_notes ?? null,
              inspected_by: values.inspected_by ?? null,
            },
            { onSuccess: () => setOpen(false) },
          )
        }
      />

      {/* History dialog */}
      <Dialog open={!!historyTask} onOpenChange={(v) => !v && setHistoryTask(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Cleaning History — Tent {historyTask?.rooms?.room_number ?? ""}
            </DialogTitle>
          </DialogHeader>
          {taskHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history recorded yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {taskHistory.map((h) => (
                <li key={h.id} className="border-b border-border pb-3 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      <StatusBadge value={h.previous_status} />
                      {" → "}
                      <StatusBadge value={h.new_status} />
                    </span>
                    <span className="text-xs text-muted-foreground">{fmt(h.created_at)}</span>
                  </div>
                  {h.cleaner_name && (
                    <p className="mt-1 text-muted-foreground">Cleaner: {h.cleaner_name}</p>
                  )}
                  {h.notes && <p className="mt-1">{h.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

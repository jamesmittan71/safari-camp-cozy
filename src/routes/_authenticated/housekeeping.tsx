import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  History,
  Plus,
  Sparkles,
  Wrench,
} from "lucide-react";
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
import { HK_PRIORITY, HK_STATUS, today, useList, useSave, useSoftDelete } from "@/lib/data";
import type { HousekeepingHistoryRow, HousekeepingRow, RoomRow, TeamMemberRow } from "@/lib/types";

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
        content: "Daily operational work queue for the Housekeeping Supervisor.",
      },
    ],
  }),
  component: HousekeepingPage,
});

const todayStr = today();

function isOverdue(task: HousekeepingRow): boolean {
  if (task.status === "clean" || task.status === "out_of_service") return false;
  const assigned = task.date_assigned ?? task.created_at?.slice(0, 10);
  return !!assigned && assigned < todayStr;
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "text-accent",
}: {
  icon: typeof Sparkles;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <Card className="shadow-lodge">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-xs tracking-wide uppercase text-muted-foreground">{label}</p>
          <Icon className={`size-4 ${tone}`} />
        </div>
        <p className="mt-2 font-display text-3xl">{value}</p>
      </CardContent>
    </Card>
  );
}

function HousekeepingPage() {
  const { canOperate } = useAuth();
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
  const save = useSave("housekeeping_tasks", "Cleaning task");
  const remove = useSoftDelete("housekeeping_tasks", "Cleaning task");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecordValues | undefined>();

  // Filters
  const [filterCamp, setFilterCamp] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCleaner, setFilterCleaner] = useState("all");
  const [filterToday, setFilterToday] = useState(false);
  const [filterOverdue, setFilterOverdue] = useState(false);

  // History modal
  const [historyTaskId, setHistoryTaskId] = useState<string | null>(null);

  const camps = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const t of tasks) {
      const camp = t.rooms?.buildings?.camps;
      if (camp && !seen.has(camp.name)) {
        seen.add(camp.name);
        list.push({ id: camp.name, name: camp.name });
      }
    }
    return list;
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterCamp !== "all" && t.rooms?.buildings?.camps?.name !== filterCamp) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterCleaner !== "all" && t.assigned_to !== filterCleaner) return false;
      if (filterToday && t.date_assigned !== todayStr) return false;
      if (filterOverdue && !isOverdue(t)) return false;
      return true;
    });
  }, [tasks, filterCamp, filterStatus, filterPriority, filterCleaner, filterToday, filterOverdue]);

  // Quick actions
  const advance = (task: HousekeepingRow) => {
    const now = new Date().toISOString();
    const transitions: Record<string, Record<string, unknown>> = {
      dirty: { status: "scheduled", date_assigned: todayStr },
      scheduled: { status: "in_progress", started_at: now },
      in_progress: { status: "inspection", completed_at: now },
      inspection: { status: "clean" },
    };
    const patch = transitions[task.status];
    if (patch) save.mutate({ id: task.id, ...patch });
  };

  const advanceLabel: Record<string, string> = {
    dirty: "Schedule",
    scheduled: "Start Cleaning",
    in_progress: "Send to Inspection",
    inspection: "Mark Clean",
  };

  // Dashboard counts
  const count = (status: string) => tasks.filter((t) => t.status === status).length;
  const overdueCount = tasks.filter(isOverdue).length;
  const cleanedToday = tasks.filter(
    (t) => t.status === "clean" && t.completed_at?.slice(0, 10) === todayStr,
  ).length;

  return (
    <div>
      <PageHeader
        title="Housekeeping"
        subtitle="Daily operational work queue for the Housekeeping Supervisor."
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

      {/* Dashboard summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          icon={AlertTriangle}
          label="Dirty"
          value={count("dirty")}
          tone="text-status-cleaning"
        />
        <Stat
          icon={Sparkles}
          label="In Progress"
          value={count("in_progress")}
          tone="text-status-occupied"
        />
        <Stat
          icon={Eye}
          label="Inspection Required"
          value={count("inspection")}
          tone="text-status-maintenance"
        />
        <Stat
          icon={CheckCircle2}
          label="Clean Today"
          value={cleanedToday}
          tone="text-status-available"
        />
        <Stat icon={Clock} label="Overdue" value={overdueCount} tone="text-destructive" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={filterCamp} onValueChange={setFilterCamp}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Camp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Camps</SelectItem>
            {camps.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
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
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {HK_PRIORITY.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCleaner} onValueChange={setFilterCleaner}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Cleaner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cleaners</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} {s.surname}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={filterToday ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterToday((v) => !v)}
        >
          <ClipboardList className="size-4 mr-1" /> Today&apos;s Jobs
        </Button>

        <Button
          variant={filterOverdue ? "destructive" : "outline"}
          size="sm"
          onClick={() => setFilterOverdue((v) => !v)}
        >
          <Clock className="size-4 mr-1" /> Overdue
        </Button>

        {(filterCamp !== "all" ||
          filterStatus !== "all" ||
          filterPriority !== "all" ||
          filterCleaner !== "all" ||
          filterToday ||
          filterOverdue) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterCamp("all");
              setFilterStatus("all");
              setFilterPriority("all");
              setFilterCleaner("all");
              setFilterToday(false);
              setFilterOverdue(false);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Work queue table */}
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
          {
            key: "building",
            label: "Block",
            render: (r) => r.rooms?.buildings?.name ?? "—",
          },
          { key: "room", label: "Tent", render: (r) => r.rooms?.room_number ?? "—" },
          {
            key: "cleaner",
            label: "Cleaner",
            render: (r) =>
              r.team_members ? `${r.team_members.name} ${r.team_members.surname}` : "—",
          },
          {
            key: "status",
            label: "Current Status",
            render: (r) => <StatusBadge value={r.status} />,
          },
          {
            key: "priority",
            label: "Priority",
            render: (r) => <StatusBadge value={r.priority} />,
          },
          {
            key: "date_assigned",
            label: "Time Assigned",
            render: (r) => r.date_assigned ?? "—",
          },
          {
            key: "overdue",
            label: "Overdue",
            render: (r) =>
              isOverdue(r) ? (
                <span className="text-destructive font-medium flex items-center gap-1">
                  <AlertTriangle className="size-3" /> Yes
                </span>
              ) : (
                "—"
              ),
          },
        ]}
        actions={
          canOperate
            ? (r) => (
                <div className="flex gap-1">
                  {advanceLabel[r.status] ? (
                    <Button size="sm" variant="secondary" onClick={() => advance(r)}>
                      {advanceLabel[r.status]}
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => setHistoryTaskId(r.id)}>
                    <History className="size-4" />
                  </Button>
                </div>
              )
            : (r) => (
                <Button size="sm" variant="ghost" onClick={() => setHistoryTaskId(r.id)}>
                  <History className="size-4" />
                </Button>
              )
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

      {/* Create / Edit dialog */}
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
              label: `${r.rooms?.buildings?.camps?.name ?? r.buildings?.camps?.name ?? ""} › ${r.buildings?.name ?? ""} › ${r.room_number}`,
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
          { name: "notes", label: "Cleaning Notes", type: "textarea", full: true },
          { name: "inspection_notes", label: "Inspection Notes", type: "textarea", full: true },
          {
            name: "inspected_by",
            label: "Inspected By",
            type: "select",
            options: staff.map((s) => ({ value: s.id, label: `${s.name} ${s.surname}` })),
          },
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
              notes: values.notes ?? null,
              inspection_notes: values.inspection_notes ?? null,
              inspected_by: values.inspected_by ?? null,
            },
            { onSuccess: () => setOpen(false) },
          )
        }
      />

      {/* History modal */}
      {historyTaskId && (
        <HousekeepingHistoryDialog taskId={historyTaskId} onClose={() => setHistoryTaskId(null)} />
      )}
    </div>
  );
}

function HousekeepingHistoryDialog({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { data: history = [], isLoading } = useList<HousekeepingHistoryRow>(
    "housekeeping_history",
    "*",
    "created_at",
  );

  const taskHistory = useMemo(() => history.filter((h) => h.task_id === taskId), [history, taskId]);

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="size-4" /> Cleaning History
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading history…</p>
        ) : taskHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history recorded yet.</p>
        ) : (
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {taskHistory.map((h) => (
              <li key={h.id} className="border-b border-border pb-2 last:border-0 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  {h.from_status ? (
                    <StatusBadge value={h.from_status} />
                  ) : (
                    <span className="text-muted-foreground text-xs">created</span>
                  )}
                  {h.from_status && <span className="text-muted-foreground">→</span>}
                  <StatusBadge value={h.to_status} />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                {h.notes && <p className="mt-1 text-muted-foreground">{h.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

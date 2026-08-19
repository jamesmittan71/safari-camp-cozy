import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Clock, History, Plus, Timer, Wrench } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { RecordDialog, type RecordValues } from "@/components/RecordDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  MAINT_CATEGORIES,
  MAINT_STATUS,
  PRIORITIES,
  today,
  useList,
  useSave,
  useSoftDelete,
} from "@/lib/data";
import type { MaintenanceHistoryRow, MaintenanceRow, RoomRow, TeamMemberRow } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance — Ten of Cups Camp Manager" },
      {
        name: "description",
        content: "Work order system for maintenance faults tracked to completion.",
      },
      { property: "og:title", content: "Maintenance — Ten of Cups Camp Manager" },
      {
        property: "og:description",
        content: "Complete maintenance work order system integrated with accommodation.",
      },
    ],
  }),
  component: MaintenancePage,
});

const OPEN_STATUSES = new Set([
  "reported",
  "assigned",
  "in_progress",
  "waiting_for_parts",
  "inspection",
]);
const todayStr = today();
const PRIORITY_WEIGHT: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };

function isOverdue(r: MaintenanceRow): boolean {
  if (!OPEN_STATUSES.has(r.status)) return false;
  return !!r.target_date && r.target_date < todayStr;
}

function ageLabel(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "text-accent",
}: {
  icon: typeof Wrench;
  label: string;
  value: number | string;
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

function MaintenancePage() {
  const { canOperate } = useAuth();
  const {
    data: reports = [],
    isLoading,
    error,
  } = useList<MaintenanceRow>(
    "maintenance_reports",
    "*, rooms(room_number, buildings(name, camps(name))), reporter:team_members!maintenance_reports_reported_by_fkey(name, surname), technician:team_members!maintenance_reports_assigned_to_fkey(name, surname)",
  );
  const { data: rooms = [] } = useList<RoomRow>(
    "rooms",
    "*, buildings(name, camps(name))",
    "room_number",
  );
  const { data: staff = [] } = useList<TeamMemberRow>("team_members", "*", "surname");
  const save = useSave("maintenance_reports", "Work order");
  const remove = useSoftDelete("maintenance_reports", "Work order");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecordValues | undefined>();
  const [historyId, setHistoryId] = useState<string | null>(null);

  // Filters
  const [filterCamp, setFilterCamp] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterTech, setFilterTech] = useState("all");
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const camps = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const r of reports) {
      const camp = r.rooms?.buildings?.camps;
      if (camp && !seen.has(camp.name)) {
        seen.add(camp.name);
        list.push({ id: camp.name, name: camp.name });
      }
    }
    return list;
  }, [reports]);

  const sorted = useMemo(
    () =>
      [...reports].sort(
        (a, b) => (PRIORITY_WEIGHT[a.priority] ?? 9) - (PRIORITY_WEIGHT[b.priority] ?? 9),
      ),
    [reports],
  );

  const filtered = useMemo(
    () =>
      sorted.filter((r) => {
        if (filterCamp !== "all" && r.rooms?.buildings?.camps?.name !== filterCamp) return false;
        if (filterStatus !== "all" && r.status !== filterStatus) return false;
        if (filterPriority !== "all" && r.priority !== filterPriority) return false;
        if (filterCategory !== "all" && r.category !== filterCategory) return false;
        if (filterTech !== "all" && r.assigned_to !== filterTech) return false;
        if (filterOverdue && !isOverdue(r)) return false;
        if (filterOpen && !OPEN_STATUSES.has(r.status)) return false;
        return true;
      }),
    [
      sorted,
      filterCamp,
      filterStatus,
      filterPriority,
      filterCategory,
      filterTech,
      filterOverdue,
      filterOpen,
    ],
  );

  // Dashboard counts
  const openCount = reports.filter((r) => OPEN_STATUSES.has(r.status)).length;
  const criticalCount = reports.filter(
    (r) => r.priority === "critical" && OPEN_STATUSES.has(r.status),
  ).length;
  const overdueCount = reports.filter(isOverdue).length;
  const completedToday = reports.filter(
    (r) => r.status === "completed" && r.completed_date === todayStr,
  ).length;

  const avgResolutionDays = useMemo(() => {
    const resolved = reports.filter((r) => r.status === "completed" && r.completed_date);
    if (!resolved.length) return "—";
    const total = resolved.reduce((sum, r) => {
      const days =
        (new Date(r.completed_date!).getTime() - new Date(r.created_at).getTime()) / 86_400_000;
      return sum + Math.max(0, days);
    }, 0);
    return `${(total / resolved.length).toFixed(1)}d`;
  }, [reports]);

  // Quick action transitions
  const NEXT_STATUS: Record<string, string> = {
    reported: "assigned",
    assigned: "in_progress",
    in_progress: "inspection",
    waiting_for_parts: "in_progress",
    inspection: "completed",
  };
  const NEXT_LABEL: Record<string, string> = {
    reported: "Assign",
    assigned: "Start Job",
    in_progress: "Send to Inspection",
    waiting_for_parts: "Resume",
    inspection: "Complete",
  };

  const advance = (r: MaintenanceRow) => {
    const next = NEXT_STATUS[r.status];
    if (!next) return;
    const patch: Record<string, unknown> = { id: r.id, status: next };
    if (next === "completed") patch["completed_date"] = todayStr;
    save.mutate(patch);
  };

  const pauseJob = (r: MaintenanceRow) => {
    save.mutate({ id: r.id, status: "waiting_for_parts" });
  };

  const cancelJob = (r: MaintenanceRow) => {
    save.mutate({ id: r.id, status: "cancelled" });
  };

  const clearFilters = () => {
    setFilterCamp("all");
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterCategory("all");
    setFilterTech("all");
    setFilterOverdue(false);
    setFilterOpen(false);
  };

  const hasFilters =
    filterCamp !== "all" ||
    filterStatus !== "all" ||
    filterPriority !== "all" ||
    filterCategory !== "all" ||
    filterTech !== "all" ||
    filterOverdue ||
    filterOpen;

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle="Work order system for fault tracking from report to completion."
        action={
          canOperate ? (
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> New work order
            </Button>
          ) : null
        }
      />

      {/* Dashboard summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={Wrench} label="Open Jobs" value={openCount} />
        <Stat
          icon={AlertTriangle}
          label="Critical Issues"
          value={criticalCount}
          tone="text-destructive"
        />
        <Stat icon={Clock} label="Overdue" value={overdueCount} tone="text-destructive" />
        <Stat
          icon={CheckCircle2}
          label="Completed Today"
          value={completedToday}
          tone="text-status-available"
        />
        <Stat icon={Timer} label="Avg Resolution" value={avgResolutionDays} />
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
            {MAINT_STATUS.map((s) => (
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
            {PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {MAINT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTech} onValueChange={setFilterTech}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Technician" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Technicians</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} {s.surname}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={filterOpen ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterOpen((v) => !v)}
        >
          Open Jobs
        </Button>

        <Button
          variant={filterOverdue ? "destructive" : "outline"}
          size="sm"
          onClick={() => setFilterOverdue((v) => !v)}
        >
          <Clock className="size-4 mr-1" /> Overdue
        </Button>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="size-4" />
          <AlertTitle>Could not load work orders</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Work order queue */}
      <DataTable<MaintenanceRow>
        loading={isLoading}
        rows={filtered}
        empty="No work orders match the current filters."
        columns={[
          { key: "work_order_number", label: "WO #", render: (r) => r.work_order_number ?? "—" },
          { key: "camp", label: "Camp", render: (r) => r.rooms?.buildings?.camps?.name ?? "—" },
          { key: "block", label: "Block", render: (r) => r.rooms?.buildings?.name ?? "—" },
          { key: "tent", label: "Tent", render: (r) => r.rooms?.room_number ?? "—" },
          {
            key: "technician",
            label: "Technician",
            render: (r) => (r.technician ? `${r.technician.name} ${r.technician.surname}` : "—"),
          },
          {
            key: "priority",
            label: "Priority",
            render: (r) => <StatusBadge value={r.priority} />,
          },
          {
            key: "status",
            label: "Status",
            render: (r) => <StatusBadge value={r.status} />,
          },
          {
            key: "age",
            label: "Age",
            render: (r) => ageLabel(r.created_at),
          },
          {
            key: "target_date",
            label: "Target Date",
            render: (r) => r.target_date ?? "—",
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
                <div className="flex gap-1 flex-wrap">
                  {NEXT_LABEL[r.status] && (
                    <Button size="sm" variant="secondary" onClick={() => advance(r)}>
                      {NEXT_LABEL[r.status]}
                    </Button>
                  )}
                  {r.status === "in_progress" && (
                    <Button size="sm" variant="outline" onClick={() => pauseJob(r)}>
                      Pause
                    </Button>
                  )}
                  {OPEN_STATUSES.has(r.status) && (
                    <Button size="sm" variant="ghost" onClick={() => cancelJob(r)}>
                      Cancel
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setHistoryId(r.id)}>
                    <History className="size-4" />
                  </Button>
                </div>
              )
            : (r) => (
                <Button size="sm" variant="ghost" onClick={() => setHistoryId(r.id)}>
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
        title={editing?.id ? `Edit ${editing.work_order_number ?? "work order"}` : "New work order"}
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
              label: `${r.buildings?.camps?.name ?? ""} › ${r.buildings?.name ?? ""} › ${r.room_number}`,
            })),
          },
          {
            name: "category",
            label: "Category",
            type: "select",
            options: MAINT_CATEGORIES,
          },
          {
            name: "reported_by",
            label: "Reported By",
            type: "select",
            options: staff.map((s) => ({ value: s.id, label: `${s.name} ${s.surname}` })),
          },
          {
            name: "assigned_to",
            label: "Assigned Technician",
            type: "select",
            options: staff.map((s) => ({ value: s.id, label: `${s.name} ${s.surname}` })),
          },
          { name: "priority", label: "Priority", type: "select", options: PRIORITIES },
          { name: "status", label: "Status", type: "select", options: MAINT_STATUS },
          { name: "target_date", label: "Target Completion Date", type: "date" },
          { name: "completed_date", label: "Completed Date", type: "date" },
          {
            name: "description",
            label: "Description",
            type: "textarea",
            required: true,
            full: true,
          },
          {
            name: "completion_notes",
            label: "Completion Notes",
            type: "textarea",
            full: true,
          },
        ]}
        onSubmit={(values: RecordValues) =>
          save.mutate(
            {
              id: values.id,
              room_id: values.room_id,
              category: values.category ?? "general",
              reported_by: values.reported_by ?? null,
              assigned_to: values.assigned_to ?? null,
              priority: values.priority ?? "normal",
              status: values.status ?? "reported",
              target_date: values.target_date ?? null,
              completed_date: values.completed_date ?? null,
              description: values.description,
              completion_notes: values.completion_notes ?? null,
            },
            { onSuccess: () => setOpen(false) },
          )
        }
      />

      {/* History modal */}
      {historyId && (
        <MaintenanceHistoryDialog reportId={historyId} onClose={() => setHistoryId(null)} />
      )}
    </div>
  );
}

function MaintenanceHistoryDialog({
  reportId,
  onClose,
}: {
  reportId: string;
  onClose: () => void;
}) {
  const { data: history = [], isLoading } = useList<MaintenanceHistoryRow>(
    "maintenance_history",
    "*",
    "created_at",
  );

  const taskHistory = useMemo(
    () => history.filter((h) => h.report_id === reportId),
    [history, reportId],
  );

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
            <History className="size-4" /> Work Order History
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

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { RecordDialog, type RecordValues } from "@/components/RecordDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { HK_STATUS, useList, useSave, useSoftDelete } from "@/lib/data";
import type { HousekeepingRow, RoomRow, TeamMemberRow } from "@/lib/types";

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
        content: "Track rooms to clean through to ready for occupancy.",
      },
    ],
  }),
  component: HousekeepingPage,
});

function HousekeepingPage() {
  const { canOperate } = useAuth();
  const { data: tasks = [], isLoading } = useList<HousekeepingRow>(
    "housekeeping_tasks",
    "*, rooms(room_number, buildings(name)), team_members(name, surname)",
  );
  const { data: rooms = [] } = useList<RoomRow>("rooms", "*, buildings(name)", "room_number");
  const { data: staff = [] } = useList<TeamMemberRow>("team_members", "*", "surname");
  const save = useSave("housekeeping_tasks", "Cleaning task");
  const saveRoom = useSave("rooms", "Room");
  const remove = useSoftDelete("housekeeping_tasks", "Cleaning task");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecordValues | undefined>();

  const counts = HK_STATUS.map((s) => ({
    ...s,
    count: tasks.filter((t) => t.status === s.value).length,
  }));

  const advance = (task: HousekeepingRow) => {
    const now = new Date().toISOString();
    if (task.status === "to_clean") {
      save.mutate({ id: task.id, status: "in_progress", started_at: now });
    } else if (task.status === "in_progress") {
      save.mutate({ id: task.id, status: "complete", completed_at: now });
    } else if (task.status === "complete") {
      save.mutate({ id: task.id, status: "ready" });
      saveRoom.mutate({ id: task.room_id, status: "available" });
    }
  };

  return (
    <div>
      <PageHeader
        title="Housekeeping"
        subtitle="From rooms to clean through to ready for occupancy."
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {counts.map((c) => (
          <Card key={c.value} className="shadow-lodge">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="font-display text-3xl">{c.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <DataTable<HousekeepingRow>
        loading={isLoading}
        rows={tasks}
        empty="No cleaning tasks logged."
        columns={[
          { key: "room", label: "Room", render: (r) => r.rooms?.room_number ?? "—" },
          { key: "building", label: "Building", render: (r) => r.rooms?.buildings?.name ?? "—" },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          {
            key: "assigned",
            label: "Assigned to",
            render: (r) =>
              r.team_members ? `${r.team_members.name} ${r.team_members.surname}` : "—",
          },
          { key: "started_at", label: "Started", render: (r) => fmt(r.started_at) },
          { key: "completed_at", label: "Completed", render: (r) => fmt(r.completed_at) },
          { key: "notes", label: "Notes" },
        ]}
        actions={
          canOperate
            ? (r) =>
                r.status === "ready" ? null : (
                  <Button size="sm" variant="secondary" onClick={() => advance(r)}>
                    {r.status === "to_clean"
                      ? "Start"
                      : r.status === "in_progress"
                        ? "Complete"
                        : "Mark ready"}
                  </Button>
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

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? "Edit cleaning task" : "New cleaning task"}
        initial={editing}
        submitting={save.isPending}
        fields={[
          {
            name: "room_id",
            label: "Room",
            type: "select",
            required: true,
            options: rooms.map((r) => ({
              value: r.id,
              label: `${r.room_number} — ${r.buildings?.name ?? ""}`,
            })),
          },
          { name: "status", label: "Status", type: "select", options: HK_STATUS },
          {
            name: "assigned_to",
            label: "Assigned to",
            type: "select",
            options: staff.map((s) => ({ value: s.id, label: `${s.name} ${s.surname}` })),
          },
          { name: "notes", label: "Cleaning notes", type: "textarea", full: true },
        ]}
        onSubmit={(values: RecordValues) =>
          save.mutate(
            {
              id: values.id,
              room_id: values.room_id,
              status: values.status ?? "to_clean",
              assigned_to: values.assigned_to ?? null,
              notes: values.notes,
            },
            { onSuccess: () => setOpen(false) },
          )
        }
      />
    </div>
  );
}

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

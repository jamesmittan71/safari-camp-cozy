import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { RecordDialog, type RecordValues } from "@/components/RecordDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { MAINT_STATUS, PRIORITIES, today, useList, useSave, useSoftDelete } from "@/lib/data";
import type { MaintenanceRow, RoomRow, TeamMemberRow } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance — Ten of Cups Camp Manager" },
      {
        name: "description",
        content: "Report and track room faults by priority through to completion.",
      },
      { property: "og:title", content: "Maintenance — Ten of Cups Camp Manager" },
      {
        property: "og:description",
        content: "Fault reporting and repair tracking for camp rooms.",
      },
    ],
  }),
  component: MaintenancePage,
});

function MaintenancePage() {
  const { canOperate } = useAuth();
  const { data: reports = [], isLoading } = useList<MaintenanceRow>(
    "maintenance_reports",
    "*, rooms(room_number, buildings(name))",
  );
  const { data: rooms = [] } = useList<RoomRow>("rooms", "*, buildings(name)", "room_number");
  const { data: staff = [] } = useList<TeamMemberRow>("team_members", "*", "surname");
  const save = useSave("maintenance_reports", "Maintenance report");
  const saveRoom = useSave("rooms", "Room");
  const remove = useSoftDelete("maintenance_reports", "Maintenance report");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecordValues | undefined>();

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle="Faults reported against rooms, tracked to completion."
        action={
          canOperate ? (
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> Report fault
            </Button>
          ) : null
        }
      />
      <DataTable<MaintenanceRow>
        loading={isLoading}
        rows={reports}
        empty="No faults reported."
        columns={[
          { key: "room", label: "Room", render: (r) => r.rooms?.room_number ?? "—" },
          { key: "building", label: "Building", render: (r) => r.rooms?.buildings?.name ?? "—" },
          { key: "priority", label: "Priority", render: (r) => <StatusBadge value={r.priority} /> },
          { key: "description", label: "Description" },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          {
            key: "created_at",
            label: "Reported",
            render: (r) => new Date(r.created_at).toLocaleDateString(),
          },
          { key: "completed_date", label: "Completed", render: (r) => r.completed_date ?? "—" },
        ]}
        actions={
          canOperate
            ? (r) =>
                r.status === "completed" ? null : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      save.mutate({ id: r.id, status: "completed", completed_date: today() });
                      saveRoom.mutate({ id: r.room_id, status: "cleaning_required" });
                    }}
                  >
                    Complete
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
        title={editing?.id ? "Edit maintenance report" : "Report a fault"}
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
          {
            name: "reported_by",
            label: "Reported by",
            type: "select",
            options: staff.map((s) => ({ value: s.id, label: `${s.name} ${s.surname}` })),
          },
          { name: "priority", label: "Priority", type: "select", options: PRIORITIES },
          { name: "status", label: "Status", type: "select", options: MAINT_STATUS },
          { name: "completed_date", label: "Completed date", type: "date" },
          {
            name: "description",
            label: "Description",
            type: "textarea",
            required: true,
            full: true,
          },
        ]}
        onSubmit={(values: RecordValues) => {
          save.mutate(
            {
              id: values.id,
              room_id: values.room_id,
              reported_by: values.reported_by ?? null,
              priority: values.priority ?? "medium",
              status: values.status ?? "open",
              completed_date: values.completed_date ?? null,
              description: values.description,
            },
            { onSuccess: () => setOpen(false) },
          );
          if (!values.id && (values.priority === "critical" || values.priority === "high")) {
            saveRoom.mutate({ id: values.room_id, status: "out_of_service" });
          }
        }}
      />
    </div>
  );
}

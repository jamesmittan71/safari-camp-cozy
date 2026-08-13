import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { RecordDialog, type RecordValues } from "@/components/RecordDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useList, useSave, useSoftDelete } from "@/lib/data";
import type { BuildingRow, CampRow } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/buildings")({
  head: () => ({
    meta: [
      { title: "Buildings — Ten of Cups Camp Manager" },
      {
        name: "description",
        content: "Manage the buildings that make up each camp on the game farm.",
      },
      { property: "og:title", content: "Buildings — Ten of Cups Camp Manager" },
      { property: "og:description", content: "Building register per camp with status tracking." },
    ],
  }),
  component: BuildingsPage,
});

function BuildingsPage() {
  const { canManage } = useAuth();
  const { data: buildings = [], isLoading } = useList<BuildingRow>("buildings", "*, camps(name)");
  const { data: camps = [] } = useList<CampRow>("camps");
  const save = useSave("buildings", "Building");
  const remove = useSoftDelete("buildings", "Building");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecordValues | undefined>();

  return (
    <div>
      <PageHeader
        title="Buildings"
        subtitle="Every building belongs to a camp and holds its rooms."
        action={
          canManage ? (
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> New building
            </Button>
          ) : null
        }
      />
      <DataTable<BuildingRow>
        loading={isLoading}
        rows={buildings}
        empty="No buildings yet."
        columns={[
          { key: "name", label: "Building" },
          { key: "camp", label: "Camp", render: (r) => r.camps?.name ?? "—" },
          { key: "description", label: "Description" },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]}
        onEdit={
          canManage
            ? (r) => {
                setEditing({ ...r } as unknown as RecordValues);
                setOpen(true);
              }
            : undefined
        }
        onDelete={canManage ? (r) => remove.mutate(r.id) : undefined}
      />

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? "Edit building" : "New building"}
        initial={editing}
        submitting={save.isPending}
        fields={[
          { name: "name", label: "Building name", required: true },
          {
            name: "camp_id",
            label: "Camp",
            type: "select",
            required: true,
            options: camps.map((c) => ({ value: c.id, label: c.name })),
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
          },
          { name: "description", label: "Description", type: "textarea" },
        ]}
        onSubmit={(values) =>
          save.mutate(
            {
              id: values.id,
              name: values.name,
              camp_id: values.camp_id,
              description: values.description,
              status: values.status ?? "active",
            },
            { onSuccess: () => setOpen(false) },
          )
        }
      />
    </div>
  );
}

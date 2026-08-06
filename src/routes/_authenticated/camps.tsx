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
import type { CampRow, RoomTypeRow } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/camps")({
  head: () => ({
    meta: [
      { title: "Camps — Ten of Cups Camp Manager" },
      {
        name: "description",
        content: "Create and manage camps and their room types across the game farm.",
      },
      { property: "og:title", content: "Camps — Ten of Cups Camp Manager" },
      {
        property: "og:description",
        content: "Camp register for the Ten of Cups private game farm.",
      },
    ],
  }),
  component: CampsPage,
});

const STATUS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function CampsPage() {
  const { canManage } = useAuth();
  const { data: camps = [], isLoading } = useList<CampRow>("camps");
  const { data: roomTypes = [] } = useList<RoomTypeRow>("room_types", "*, camps(name)");
  const saveCamp = useSave("camps", "Camp");
  const deleteCamp = useSoftDelete("camps", "Camp");
  const saveType = useSave("room_types", "Room type");
  const deleteType = useSoftDelete("room_types", "Room type");

  const [campOpen, setCampOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [editing, setEditing] = useState<RecordValues | undefined>();
  const [editingType, setEditingType] = useState<RecordValues | undefined>();

  return (
    <div className="space-y-10">
      <div>
        <PageHeader
          title="Camps"
          subtitle="Each camp holds its own buildings, room types and housekeeping."
          action={
            canManage ? (
              <Button
                onClick={() => {
                  setEditing(undefined);
                  setCampOpen(true);
                }}
              >
                <Plus className="size-4" /> New camp
              </Button>
            ) : null
          }
        />
        <DataTable<CampRow>
          loading={isLoading}
          empty="No camps yet — create your first camp."
          rows={camps}
          columns={[
            { key: "name", label: "Camp" },
            { key: "code", label: "Code" },
            { key: "location", label: "Location" },
            { key: "description", label: "Description" },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          ]}
          onEdit={
            canManage
              ? (r) => {
                  setEditing({ ...r } as unknown as RecordValues);
                  setCampOpen(true);
                }
              : undefined
          }
          onDelete={canManage ? (r) => deleteCamp.mutate(r.id) : undefined}
        />
      </div>

      <div>
        <PageHeader
          title="Room Types"
          subtitle="Reusable room categories per camp."
          action={
            canManage ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingType(undefined);
                  setTypeOpen(true);
                }}
              >
                <Plus className="size-4" /> New room type
              </Button>
            ) : null
          }
        />
        <DataTable<RoomTypeRow>
          rows={roomTypes}
          empty="No room types defined."
          columns={[
            { key: "name", label: "Room type" },
            { key: "camp", label: "Camp", render: (r) => r.camps?.name ?? "—" },
            { key: "description", label: "Description" },
          ]}
          onEdit={
            canManage
              ? (r) => {
                  setEditingType({ ...r } as unknown as RecordValues);
                  setTypeOpen(true);
                }
              : undefined
          }
          onDelete={canManage ? (r) => deleteType.mutate(r.id) : undefined}
        />
      </div>

      <RecordDialog
        open={campOpen}
        onOpenChange={setCampOpen}
        title={editing?.id ? "Edit camp" : "New camp"}
        initial={editing}
        submitting={saveCamp.isPending}
        fields={[
          { name: "name", label: "Camp name", required: true },
          { name: "code", label: "Code" },
          { name: "location", label: "Location" },
          { name: "status", label: "Status", type: "select", options: STATUS },
          { name: "description", label: "Description", type: "textarea" },
        ]}
        onSubmit={(values) => {
          saveCamp.mutate(
            {
              id: values.id,
              name: values.name,
              code: values.code,
              location: values.location,
              description: values.description,
              status: values.status ?? "active",
            },
            { onSuccess: () => setCampOpen(false) },
          );
        }}
      />

      <RecordDialog
        open={typeOpen}
        onOpenChange={setTypeOpen}
        title={editingType?.id ? "Edit room type" : "New room type"}
        initial={editingType}
        submitting={saveType.isPending}
        fields={[
          { name: "name", label: "Room type name", required: true },
          {
            name: "camp_id",
            label: "Camp",
            type: "select",
            required: true,
            options: camps.map((c) => ({ value: c.id, label: c.name })),
          },
          { name: "description", label: "Description", type: "textarea" },
        ]}
        onSubmit={(values) => {
          saveType.mutate(
            {
              id: values.id,
              name: values.name,
              camp_id: values.camp_id,
              description: values.description,
            },
            { onSuccess: () => setTypeOpen(false) },
          );
        }}
      />
    </div>
  );
}

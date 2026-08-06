import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { RecordDialog, type RecordValues } from "@/components/RecordDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { ROOM_STATUS, useList, useSave, useSoftDelete } from "@/lib/data";
import type { BuildingRow, RoomRow, RoomTypeRow } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/rooms")({
  head: () => ({
    meta: [
      { title: "Rooms — Ten of Cups Camp Manager" },
      {
        name: "description",
        content: "Room register with bed configuration, occupancy limits and live status.",
      },
      { property: "og:title", content: "Rooms — Ten of Cups Camp Manager" },
      { property: "og:description", content: "Track every room's status across the reserve." },
    ],
  }),
  component: RoomsPage,
});

function RoomsPage() {
  const { canManage, canOperate } = useAuth();
  const { data: rooms = [], isLoading } = useList<RoomRow>(
    "rooms",
    "*, buildings(name, camps(name)), room_types(name)",
  );
  const { data: buildings = [] } = useList<BuildingRow>("buildings", "*, camps(name)");
  const { data: roomTypes = [] } = useList<RoomTypeRow>("room_types");
  const save = useSave("rooms", "Room");
  const remove = useSoftDelete("rooms", "Room");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecordValues | undefined>();
  const [search, setSearch] = useState("");

  const filtered = rooms.filter((r) => {
    const hay =
      `${r.room_number} ${r.buildings?.name ?? ""} ${r.buildings?.camps?.name ?? ""} ${r.status}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  return (
    <div>
      <PageHeader
        title="Rooms"
        subtitle="Bed configuration, occupancy and current status for every room."
        action={
          canManage ? (
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> New room
            </Button>
          ) : null
        }
      />
      <Input
        className="mb-4 max-w-sm"
        placeholder="Search rooms, buildings or camps…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <DataTable<RoomRow>
        loading={isLoading}
        rows={filtered}
        empty="No rooms yet."
        columns={[
          { key: "room_number", label: "Room" },
          { key: "building", label: "Building", render: (r) => r.buildings?.name ?? "—" },
          { key: "camp", label: "Camp", render: (r) => r.buildings?.camps?.name ?? "—" },
          { key: "type", label: "Type", render: (r) => r.room_types?.name ?? "—" },
          {
            key: "bed_configuration",
            label: "Beds",
            render: (r) => (r.bed_configuration === "double" ? "Double" : "Twin"),
          },
          { key: "max_occupancy", label: "Max" },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "maintenance_notes", label: "Maintenance notes" },
        ]}
        onEdit={
          canOperate
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
        title={editing?.id ? `Edit room ${editing.room_number ?? ""}` : "New room"}
        initial={editing}
        submitting={save.isPending}
        fields={[
          { name: "room_number", label: "Room number", required: true },
          {
            name: "building_id",
            label: "Building",
            type: "select",
            required: true,
            options: buildings.map((b) => ({
              value: b.id,
              label: `${b.name} — ${b.camps?.name ?? ""}`,
            })),
          },
          {
            name: "room_type_id",
            label: "Room type",
            type: "select",
            options: roomTypes.map((t) => ({ value: t.id, label: t.name })),
          },
          {
            name: "bed_configuration",
            label: "Bed configuration",
            type: "select",
            options: [
              { value: "twin", label: "Twin" },
              { value: "double", label: "Double" },
            ],
          },
          { name: "max_occupancy", label: "Maximum occupancy", type: "number" },
          { name: "status", label: "Status", type: "select", options: ROOM_STATUS },
          { name: "maintenance_notes", label: "Maintenance notes", type: "textarea" },
        ]}
        onSubmit={(values) =>
          save.mutate(
            {
              id: values.id,
              room_number: values.room_number,
              building_id: values.building_id,
              room_type_id: values.room_type_id ?? null,
              bed_configuration: values.bed_configuration ?? "twin",
              max_occupancy: Number(values.max_occupancy ?? 2) || 2,
              status: values.status ?? "available",
              maintenance_notes: values.maintenance_notes,
            },
            { onSuccess: () => setOpen(false) },
          )
        }
      />
    </div>
  );
}

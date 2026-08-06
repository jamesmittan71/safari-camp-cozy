import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BedDouble, Building2, ClipboardList, Plus, Tent } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { RecordDialog, type RecordValues } from "@/components/RecordDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useList, useSave, useSoftDelete } from "@/lib/data";
import type { BuildingRow, CampRow, RoomRow, RoomTypeRow } from "@/lib/types";

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

type RoomWithCamp = Pick<RoomRow, "id" | "status" | "max_occupancy"> & {
  buildings?: Pick<BuildingRow, "camp_id"> | null;
};

function CampsPage() {
  const { canManage } = useAuth();
  const { data: camps = [], isLoading } = useList<CampRow>("camps");
  const { data: roomTypes = [] } = useList<RoomTypeRow>("room_types", "*, camps(name)");
  const { data: buildings = [] } = useList<BuildingRow>("buildings", "id, camp_id");
  const { data: rooms = [] } = useList<RoomWithCamp>(
    "rooms",
    "id, status, max_occupancy, buildings(camp_id)",
  );
  const saveCamp = useSave("camps", "Camp");
  const deleteCamp = useSoftDelete("camps", "Camp");
  const saveType = useSave("room_types", "Room type");
  const deleteType = useSoftDelete("room_types", "Room type");

  const [campOpen, setCampOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [editing, setEditing] = useState<RecordValues | undefined>();
  const [editingType, setEditingType] = useState<RecordValues | undefined>();
  const [campQuery, setCampQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roomTypeCampFilter, setRoomTypeCampFilter] = useState("all");

  const campStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        buildings: number;
        roomTypes: number;
        tents: number;
        beds: number;
        available: number;
        occupied: number;
        dirty: number;
        maintenance: number;
      }
    >();

    for (const camp of camps) {
      stats.set(camp.id, {
        buildings: 0,
        roomTypes: 0,
        tents: 0,
        beds: 0,
        available: 0,
        occupied: 0,
        dirty: 0,
        maintenance: 0,
      });
    }

    for (const building of buildings) {
      const record = stats.get(building.camp_id);
      if (!record) continue;
      record.buildings += 1;
    }

    for (const roomType of roomTypes) {
      const record = stats.get(roomType.camp_id);
      if (!record) continue;
      record.roomTypes += 1;
    }

    for (const room of rooms) {
      const campId = room.buildings?.camp_id;
      if (!campId) continue;

      const record = stats.get(campId);
      if (!record) continue;

      record.tents += 1;
      record.beds += Number(room.max_occupancy ?? 0) || 0;

      if (room.status === "available") record.available += 1;
      else if (room.status === "occupied") record.occupied += 1;
      else if (room.status === "cleaning_required") record.dirty += 1;
      else if (room.status === "maintenance") record.maintenance += 1;
    }

    return stats;
  }, [buildings, camps, roomTypes, rooms]);

  const filteredCamps = useMemo(() => {
    const query = campQuery.trim().toLowerCase();

    return camps.filter((camp) => {
      const matchesQuery =
        !query ||
        `${camp.name} ${camp.code ?? ""} ${camp.location ?? ""} ${camp.description ?? ""}`
          .toLowerCase()
          .includes(query);
      const matchesStatus = statusFilter === "all" || camp.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [campQuery, camps, statusFilter]);

  const filteredRoomTypes = useMemo(
    () =>
      roomTypeCampFilter === "all"
        ? roomTypes
        : roomTypes.filter((item) => item.camp_id === roomTypeCampFilter),
    [roomTypeCampFilter, roomTypes],
  );

  const totalBeds = Array.from(campStats.values()).reduce((sum, record) => sum + record.beds, 0);
  const totalTents = Array.from(campStats.values()).reduce((sum, record) => sum + record.tents, 0);
  const totalBuildings = Array.from(campStats.values()).reduce(
    (sum, record) => sum + record.buildings,
    0,
  );

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat icon={Tent} label="Camps" value={camps.length} />
        <MiniStat icon={Building2} label="Blocks" value={totalBuildings} />
        <MiniStat icon={BedDouble} label="Tents" value={totalTents} />
        <MiniStat icon={ClipboardList} label="Beds" value={totalBeds} />
      </div>

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

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Input
            value={campQuery}
            onChange={(e) => setCampQuery(e.target.value)}
            placeholder="Search camp name, code or location..."
            className="sm:col-span-2"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DataTable<CampRow>
          loading={isLoading}
          empty="No camps yet — create your first camp."
          rows={filteredCamps}
          columns={[
            { key: "name", label: "Camp" },
            { key: "code", label: "Code" },
            { key: "location", label: "Location" },
            {
              key: "portfolio",
              label: "Portfolio",
              render: (r) => {
                const stats = campStats.get(r.id);
                if (!stats) return "0 blocks • 0 room types • 0 tents";
                return `${stats.buildings} blocks • ${stats.roomTypes} room types • ${stats.tents} tents`;
              },
            },
            {
              key: "operations",
              label: "Operations",
              render: (r) => {
                const stats = campStats.get(r.id);
                if (!stats) return "0 occupied • 0 dirty • 0 maintenance";
                return `${stats.occupied} occupied • ${stats.dirty} dirty • ${stats.maintenance} maintenance`;
              },
            },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          ]}
          actions={(r) => (
            <div className="mr-2 hidden items-center gap-2 md:flex">
              <Button asChild size="sm" variant="outline">
                <Link to="/buildings" search={(prev) => prev}>
                  Blocks
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/rooms" search={(prev) => prev}>
                  Tents
                </Link>
              </Button>
            </div>
          )}
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

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="text-sm text-muted-foreground sm:col-span-2">
            {filteredRoomTypes.length} room type{filteredRoomTypes.length === 1 ? "" : "s"} shown
          </div>
          <Select value={roomTypeCampFilter} onValueChange={setRoomTypeCampFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by camp" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All camps</SelectItem>
              {camps.map((camp) => (
                <SelectItem key={camp.id} value={camp.id}>
                  {camp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DataTable<RoomTypeRow>
          rows={filteredRoomTypes}
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

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Tent;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <Icon className="size-5 text-primary" />
      </CardContent>
    </Card>
  );
}

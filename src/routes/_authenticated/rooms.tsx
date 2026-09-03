import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { RecordDialog, type RecordValues } from "@/components/RecordDialog";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ROOM_STATUS,
  isActiveOn,
  today,
  useInsert,
  useList,
  useSave,
  useSoftDelete,
} from "@/lib/data";
import type {
  AllocationRow,
  BuildingRow,
  CampRow,
  HousekeepingRow,
  MaintenanceRow,
  RoomRow,
  RoomTypeRow,
  TeamMemberRow,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/rooms")({
  head: () => ({
    meta: [
      { title: "Accommodation Board — Ten of Cups Camp Manager" },
      {
        name: "description",
        content:
          "Live accommodation board showing bed occupancy, status and allocation for every tent.",
      },
      { property: "og:title", content: "Accommodation Board — Ten of Cups Camp Manager" },
      {
        property: "og:description",
        content: "The operational heart of Ten of Cups camp management.",
      },
    ],
  }),
  component: RoomsPage,
});

type ComputedStatus = "maintenance" | "dirty" | "occupied" | "available";

const OPEN_MAINT = new Set([
  "reported",
  "assigned",
  "in_progress",
  "waiting_for_parts",
  "inspection",
]);

type HistoryInput = {
  allocation_id?: string | null;
  staff_id?: string | null;
  staff_name?: string | null;
  previous_room_id?: string | null;
  previous_room_number?: string | null;
  previous_bed?: string | null;
  new_room_id?: string | null;
  new_room_number?: string | null;
  new_bed?: string | null;
  action: string;
  reason?: string | null;
  performed_by?: string | null;
  performed_by_name?: string | null;
};

const STATUS_BORDER: Record<ComputedStatus, string> = {
  maintenance: "border-l-4 border-l-status-maintenance",
  dirty: "border-l-4 border-l-status-cleaning",
  occupied: "border-l-4 border-l-status-occupied",
  available: "border-l-4 border-l-status-available",
};

function computeStatus(
  room: RoomRow,
  maintenance: MaintenanceRow[],
  housekeeping: HousekeepingRow[],
  hasActiveAllocation: boolean,
): ComputedStatus {
  const hasMaintenance = maintenance.some(
    (report) => report.room_id === room.id && OPEN_MAINT.has(report.status),
  );
  if (hasMaintenance) return "maintenance";

  const hasHousekeeping =
    room.status === "cleaning_required" ||
    housekeeping.some(
      (task) =>
        task.room_id === room.id &&
        ["dirty", "cleaning_scheduled", "cleaning_in_progress", "inspection_required"].includes(
          task.status,
        ),
    );
  if (hasHousekeeping) return "dirty";

  if (hasActiveAllocation) return "occupied";
  return "available";
}

function RoomsPage() {
  const { canManage, canOperate, fullName, user } = useAuth();
  const day = today();

  const { data: rooms = [], isLoading } = useList<RoomRow>(
    "rooms",
    "*, buildings(name, camps(name)), room_types(name)",
  );
  const { data: allocations = [] } = useList<AllocationRow>(
    "allocations",
    "*, rooms(room_number)",
    "arrival_date",
  );
  const { data: housekeepingTasks = [] } = useList<HousekeepingRow>(
    "housekeeping_tasks",
    "*, team_members(name, surname)",
    "created_at",
  );
  const { data: maintenanceReports = [] } = useList<MaintenanceRow>(
    "maintenance_reports",
    "*",
    "created_at",
  );
  const { data: members = [] } = useList<TeamMemberRow>("team_members", "*", "surname");
  const { data: buildings = [] } = useList<BuildingRow>("buildings", "*, camps(name)");
  const { data: camps = [] } = useList<CampRow>("camps", "*");
  const { data: roomTypes = [] } = useList<RoomTypeRow>("room_types", "*", "name");

  const saveAllocation = useSave("allocations", "Allocation");
  const saveRoom = useSave("rooms", "Room");
  const deleteAllocation = useSoftDelete("allocations", "Allocation");
  const deleteRoom = useSoftDelete("rooms", "Tent");
  const insertHistory = useInsert("allocation_history", "History");

  const [campFilter, setCampFilter] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTent, setSearchTent] = useState("");
  const [searchStaff, setSearchStaff] = useState("");

  const [roomOpen, setRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RecordValues | undefined>();
  const [roomToDelete, setRoomToDelete] = useState<RoomRow | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ room: RoomRow; bed: "A" | "B" } | null>(null);

  const activeAllocations = useMemo(
    () => allocations.filter((allocation) => isActiveOn(allocation, day)),
    [allocations, day],
  );

  const allocationByRoomId = useMemo(
    () => new Map(activeAllocations.map((allocation) => [allocation.room_id, allocation] as const)),
    [activeAllocations],
  );

  const housekeepingByRoomId = useMemo(() => {
    const map = new Map<string, HousekeepingRow>();
    for (const task of housekeepingTasks) {
      map.set(task.room_id, task);
    }
    return map;
  }, [housekeepingTasks]);

  const maintenanceByRoomId = useMemo(() => {
    const map = new Map<string, MaintenanceRow[]>();
    for (const report of maintenanceReports) {
      if (!OPEN_MAINT.has(report.status)) continue;
      const bucket = map.get(report.room_id) ?? [];
      bucket.push(report);
      map.set(report.room_id, bucket);
    }
    return map;
  }, [maintenanceReports]);

  const buildingById = useMemo(
    () => new Map(buildings.map((building) => [building.id, building] as const)),
    [buildings],
  );

  const roomStatusById = useMemo(() => {
    const map = new Map<string, ComputedStatus>();
    for (const room of rooms) {
      map.set(
        room.id,
        computeStatus(
          room,
          maintenanceByRoomId.get(room.id) ?? [],
          housekeepingTasks,
          allocationByRoomId.has(room.id),
        ),
      );
    }
    return map;
  }, [allocationByRoomId, housekeepingTasks, maintenanceByRoomId, rooms]);

  const totalBeds = rooms.reduce((sum, room) => sum + (room.max_occupancy ?? 1), 0);
  const occupiedBeds = activeAllocations.reduce((sum, allocation) => {
    let occupied = 0;
    if (allocation.bed_a || allocation.bed_a_name) occupied += 1;
    if (allocation.bed_b || allocation.bed_b_name) occupied += 1;
    return sum + occupied;
  }, 0);
  const availableBeds = totalBeds - occupiedBeds;
  const overallPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const filteredBuildings = useMemo(
    () =>
      campFilter ? buildings.filter((building) => building.camp_id === campFilter) : buildings,
    [buildings, campFilter],
  );

  const filteredRooms = useMemo(() => {
    const tentQuery = searchTent.trim().toLowerCase();
    const staffQuery = searchStaff.trim().toLowerCase();

    return rooms.filter((room) => {
      const building = buildingById.get(room.building_id);
      const allocation = allocationByRoomId.get(room.id) ?? null;
      const computed = roomStatusById.get(room.id) ?? "available";

      if (campFilter && building?.camp_id !== campFilter) return false;
      if (blockFilter && room.building_id !== blockFilter) return false;
      if (statusFilter && computed !== statusFilter) return false;
      if (tentQuery && !room.room_number.toLowerCase().includes(tentQuery)) return false;

      if (staffQuery) {
        const names =
          `${allocation?.bed_a_name ?? ""} ${allocation?.bed_b_name ?? ""}`.toLowerCase();
        if (!names.includes(staffQuery)) return false;
      }

      return true;
    });
  }, [
    allocationByRoomId,
    blockFilter,
    buildingById,
    campFilter,
    roomStatusById,
    rooms,
    searchStaff,
    searchTent,
    statusFilter,
  ]);

  function recordHistory(values: HistoryInput) {
    insertHistory.mutate({
      ...values,
      performed_by: values.performed_by ?? user?.id ?? null,
      performed_by_name: values.performed_by_name ?? fullName ?? null,
    });
  }

  function getRoomAllocation(roomId: string) {
    return allocationByRoomId.get(roomId) ?? null;
  }

  function handleAssignOpen(room: RoomRow, bed: "A" | "B") {
    setAssignTarget({ room, bed });
    setAssignOpen(true);
  }

  function handleAssignSubmit(values: RecordValues) {
    if (!assignTarget) return;

    const { room, bed } = assignTarget;
    const memberId = values.staff_id as string | null;
    const member = members.find((item) => item.id === memberId);
    if (!member || !memberId) {
      toast.error("Please select a staff member.");
      return;
    }

    const memberName = `${member.name} ${member.surname}`;
    const existing = getRoomAllocation(room.id);
    const bedKey = bed === "A" ? "bed_a" : "bed_b";
    const bedNameKey = bed === "A" ? "bed_a_name" : "bed_b_name";

    if (existing?.[bedKey]) {
      toast.error(`Bed ${bed} is already occupied.`);
      return;
    }

    const alreadyAllocated = activeAllocations.some(
      (allocation) => allocation.bed_a === memberId || allocation.bed_b === memberId,
    );
    if (alreadyAllocated) {
      toast.error(`${memberName} is already allocated to another tent today.`);
      return;
    }

    const reason = (values.reason as string | null) ?? null;

    if (existing) {
      saveAllocation.mutate(
        {
          id: existing.id,
          [bedKey]: memberId,
          [bedNameKey]: memberName,
        },
        {
          onSuccess: () => {
            recordHistory({
              allocation_id: existing.id,
              staff_id: memberId,
              staff_name: memberName,
              new_room_id: room.id,
              new_room_number: room.room_number,
              new_bed: `Bed ${bed}`,
              action: "assign",
              reason,
            });
            setAssignOpen(false);
            setAssignTarget(null);
          },
        },
      );
      return;
    }

    saveAllocation.mutate(
      {
        room_id: room.id,
        arrival_date: day,
        departure_date: "2099-12-31",
        status: "booked",
        bed_a: bed === "A" ? memberId : null,
        bed_a_name: bed === "A" ? memberName : null,
        bed_b: bed === "B" ? memberId : null,
        bed_b_name: bed === "B" ? memberName : null,
      },
      {
        onSuccess: () => {
          recordHistory({
            staff_id: memberId,
            staff_name: memberName,
            new_room_id: room.id,
            new_room_number: room.room_number,
            new_bed: `Bed ${bed}`,
            action: "assign",
            reason,
          });
          setAssignOpen(false);
          setAssignTarget(null);
        },
      },
    );
  }

  function handleRemoveBed(allocation: AllocationRow, bed: "A" | "B") {
    const room = rooms.find((item) => item.id === allocation.room_id);
    const bedKey = bed === "A" ? "bed_a" : "bed_b";
    const bedNameKey = bed === "A" ? "bed_a_name" : "bed_b_name";
    const otherBedKey = bed === "A" ? "bed_b" : "bed_a";
    const otherBedNameKey = bed === "A" ? "bed_b_name" : "bed_a_name";
    const staffId = allocation[bedKey];
    const staffName = allocation[bedNameKey];

    saveAllocation.mutate(
      {
        id: allocation.id,
        [bedKey]: null,
        [bedNameKey]: null,
      },
      {
        onSuccess: () => {
          recordHistory({
            allocation_id: allocation.id,
            staff_id: staffId ?? null,
            staff_name: staffName ?? null,
            previous_room_id: allocation.room_id,
            previous_room_number: room?.room_number ?? null,
            previous_bed: `Bed ${bed}`,
            action: "remove",
          });

          if (!allocation[otherBedKey] && !allocation[otherBedNameKey]) {
            deleteAllocation.mutate(allocation.id);
          }
        },
      },
    );
  }

  function handleCheckIn(allocation: AllocationRow) {
    const room = rooms.find((item) => item.id === allocation.room_id);
    saveAllocation.mutate(
      { id: allocation.id, status: "checked_in" },
      {
        onSuccess: () => {
          recordHistory({
            allocation_id: allocation.id,
            new_room_id: allocation.room_id,
            new_room_number: room?.room_number ?? null,
            action: "check_in",
          });
        },
      },
    );
  }

  function handleCheckOut(allocation: AllocationRow) {
    const room = rooms.find((item) => item.id === allocation.room_id);
    saveAllocation.mutate(
      { id: allocation.id, status: "checked_out", departure_date: day },
      {
        onSuccess: () => {
          saveRoom.mutate({ id: allocation.room_id, status: "cleaning_required" });
          recordHistory({
            allocation_id: allocation.id,
            previous_room_id: allocation.room_id,
            previous_room_number: room?.room_number ?? null,
            action: "check_out",
          });
        },
      },
    );
  }

  const memberOptions = useMemo(
    () =>
      members.map((member) => ({ value: member.id, label: `${member.name} ${member.surname}` })),
    [members],
  );

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Accommodation Board" subtitle="Loading…" />
        <p className="text-muted-foreground">Loading board…</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Accommodation Board"
        subtitle="Live bed occupancy, allocation and status for every tent."
        action={
          canManage ? (
            <Button
              onClick={() => {
                setEditingRoom(undefined);
                setRoomOpen(true);
              }}
            >
              <Plus className="size-4" /> New tent
            </Button>
          ) : null
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Beds" value={totalBeds} />
        <SummaryCard label="Occupied Beds" value={occupiedBeds} />
        <SummaryCard label="Available Beds" value={availableBeds} />
        <SummaryCard label="Overall Occupancy" value={`${overallPct}%`} />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Select
          value={campFilter || "__all"}
          onValueChange={(value) => {
            setCampFilter(value === "__all" ? "" : value);
            setBlockFilter("");
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All camps" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All camps</SelectItem>
            {camps.map((camp) => (
              <SelectItem key={camp.id} value={camp.id}>
                {camp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={blockFilter || "__all"}
          onValueChange={(value) => setBlockFilter(value === "__all" ? "" : value)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All blocks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All blocks</SelectItem>
            {filteredBuildings.map((building) => (
              <SelectItem key={building.id} value={building.id}>
                {building.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter || "__all"}
          onValueChange={(value) => setStatusFilter(value === "__all" ? "" : value)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="dirty">Dirty / Cleaning</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>

        <Input
          className="w-44"
          placeholder="Search tent…"
          value={searchTent}
          onChange={(event) => setSearchTent(event.target.value)}
        />
        <Input
          className="w-44"
          placeholder="Search staff…"
          value={searchStaff}
          onChange={(event) => setSearchStaff(event.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRooms.length === 0 ? (
          <p className="col-span-full py-12 text-center text-muted-foreground">
            No tents match the current filters.
          </p>
        ) : null}

        {filteredRooms.map((room) => (
          <TentCard
            key={room.id}
            room={room}
            allocation={getRoomAllocation(room.id)}
            hk={housekeepingByRoomId.get(room.id) ?? null}
            maint={maintenanceByRoomId.get(room.id) ?? []}
            computed={roomStatusById.get(room.id) ?? "available"}
            canOperate={canOperate}
            canManage={canManage}
            onEdit={(currentRoom) => {
              setEditingRoom({ ...currentRoom } as RecordValues);
              setRoomOpen(true);
            }}
            onDelete={setRoomToDelete}
            onAssign={handleAssignOpen}
            onRemoveBed={handleRemoveBed}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
          />
        ))}
      </div>

      <RecordDialog
        open={roomOpen}
        onOpenChange={setRoomOpen}
        title={editingRoom?.id ? `Edit tent ${editingRoom.room_number ?? ""}` : "New tent"}
        initial={editingRoom}
        submitting={saveRoom.isPending}
        fields={[
          { name: "room_number", label: "Tent number", required: true },
          {
            name: "building_id",
            label: "Block / Building",
            type: "select",
            required: true,
            options: buildings.map((building) => ({
              value: building.id,
              label: `${building.name} — ${building.camps?.name ?? ""}`,
            })),
          },
          {
            name: "room_type_id",
            label: "Room type",
            type: "select",
            options: roomTypes.map((roomType) => ({ value: roomType.id, label: roomType.name })),
          },
          {
            name: "bed_configuration",
            label: "Bed configuration",
            type: "select",
            options: [
              { value: "twin", label: "Twin (Bed A + Bed B)" },
              { value: "double", label: "Double / Single (Bed A)" },
            ],
          },
          { name: "max_occupancy", label: "Maximum occupancy", type: "number" },
          { name: "status", label: "Status", type: "select", options: ROOM_STATUS },
          { name: "maintenance_notes", label: "Maintenance notes", type: "textarea" },
          {
            name: "setup_image_url",
            label: "Setup reference image URL",
            type: "text",
            placeholder: "https://example.com/image.jpg or Supabase Storage URL",
          },
        ]}
        onSubmit={(values) =>
          saveRoom.mutate(
            {
              id: values.id,
              room_number: values.room_number,
              building_id: values.building_id,
              room_type_id: values.room_type_id ?? null,
              bed_configuration: values.bed_configuration ?? "twin",
              max_occupancy: Number(values.max_occupancy ?? 2) || 2,
              status: values.status ?? "available",
              maintenance_notes: values.maintenance_notes,
              setup_image_url: values.setup_image_url ?? null,
            },
            {
              onSuccess: async () => {
                setRoomOpen(false);
                if (!user?.id) return;
                const action = values.id ? "updated" : "created";
                await supabase.from("activity_log").insert({
                  entity_type: "room",
                  entity_id: values.id,
                  action,
                  actor_user_id: user.id,
                  actor_name: fullName ?? "Unknown",
                  summary: `Tent ${values.room_number} ${action}`,
                  details: {
                    status: values.status ?? "available",
                    setup_image_url: values.setup_image_url ?? null,
                  },
                });
              },
            },
          )
        }
      />

      <AlertDialog
        open={Boolean(roomToDelete)}
        onOpenChange={(open) => {
          if (!open) setRoomToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove tent {roomToDelete?.room_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This hides the tent from normal operations. Existing allocation and history records
              will be retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteRoom.isPending}
              onClick={() => {
                if (roomToDelete) deleteRoom.mutate(roomToDelete.id);
                setRoomToDelete(null);
              }}
            >
              Remove tent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RecordDialog
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) setAssignTarget(null);
        }}
        title={
          assignTarget
            ? `Assign to ${assignTarget.room.room_number} Bed ${assignTarget.bed}`
            : "Assign Staff"
        }
        submitting={saveAllocation.isPending}
        fields={[
          {
            name: "staff_id",
            label: "Staff member",
            type: "select",
            required: true,
            options: memberOptions,
          },
          { name: "reason", label: "Reason / notes", type: "textarea" },
        ]}
        onSubmit={handleAssignSubmit}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="shadow-lodge">
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-display text-3xl">{value}</p>
      </CardContent>
    </Card>
  );
}

interface TentCardProps {
  room: RoomRow;
  allocation: AllocationRow | null;
  hk: HousekeepingRow | null;
  maint: MaintenanceRow[];
  computed: ComputedStatus;
  canOperate: boolean;
  canManage: boolean;
  onEdit: (room: RoomRow) => void;
  onDelete: (room: RoomRow) => void;
  onAssign: (room: RoomRow, bed: "A" | "B") => void;
  onRemoveBed: (allocation: AllocationRow, bed: "A" | "B") => void;
  onCheckIn: (allocation: AllocationRow) => void;
  onCheckOut: (allocation: AllocationRow) => void;
}

function TentCard({
  room,
  allocation,
  hk,
  maint,
  computed,
  canOperate,
  canManage,
  onEdit,
  onDelete,
  onAssign,
  onRemoveBed,
  onCheckIn,
  onCheckOut,
}: TentCardProps) {
  const bedAName = allocation?.bed_a_name ?? (allocation?.bed_a ? "Staff" : null);
  const bedBName = allocation?.bed_b_name ?? (allocation?.bed_b ? "Staff" : null);
  const showBedB = room.bed_configuration === "twin" || room.max_occupancy >= 2;

  return (
    <Card className={cn("overflow-hidden shadow-lodge", STATUS_BORDER[computed])}>
      {room.setup_image_url ? (
        <div className="relative h-32 overflow-hidden bg-muted">
          <img
            src={room.setup_image_url}
            alt={`Setup reference for ${room.room_number}`}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{room.room_number}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {room.buildings?.camps?.name ?? "—"} · {room.buildings?.name ?? "—"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge value={computed} />
            {allocation?.status === "checked_in" ? <StatusBadge value="checked_in" /> : null}
          </div>
        </div>
        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
          <span>Type: {room.room_types?.name ?? room.bed_configuration ?? "—"}</span>
          <span>Capacity: {room.max_occupancy}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <BedSlot
          label="Bed A"
          occupied={!!bedAName}
          name={bedAName}
          canOperate={canOperate}
          onAssign={() => onAssign(room, "A")}
          onRemove={allocation && bedAName ? () => onRemoveBed(allocation, "A") : undefined}
        />

        {showBedB ? (
          <BedSlot
            label="Bed B"
            occupied={!!bedBName}
            name={bedBName}
            canOperate={canOperate}
            onAssign={() => onAssign(room, "B")}
            onRemove={allocation && bedBName ? () => onRemoveBed(allocation, "B") : undefined}
          />
        ) : null}

        {allocation && canOperate ? (
          <div className="flex gap-2 pt-1">
            {allocation.status !== "checked_in" && allocation.status !== "checked_out" ? (
              <Button size="sm" variant="secondary" onClick={() => onCheckIn(allocation)}>
                Check In
              </Button>
            ) : null}
            {allocation.status === "checked_in" ? (
              <Button size="sm" variant="secondary" onClick={() => onCheckOut(allocation)}>
                Check Out
              </Button>
            ) : null}
          </div>
        ) : null}

        {hk ? (
          <div className="space-y-0.5 rounded-md bg-muted/50 p-2 text-xs">
            <p className="font-medium text-muted-foreground">Housekeeping</p>
            <div className="flex items-center gap-1">
              <span>Status:</span>
              <StatusBadge value={hk.status} />
            </div>
            {hk.team_members ? (
              <p>
                Cleaner: {hk.team_members.name} {hk.team_members.surname}
              </p>
            ) : null}
            {hk.completed_at ? (
              <p>Last cleaned: {new Date(hk.completed_at).toLocaleDateString()}</p>
            ) : null}
          </div>
        ) : null}

        {maint.length > 0 ? (
          <div className="space-y-0.5 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
            <div className="flex items-center gap-1 font-medium text-destructive">
              <Wrench className="size-3.5" />
              <span>Maintenance ({maint.length})</span>
            </div>
            {maint.slice(0, 2).map((report) => (
              <div key={report.id} className="text-muted-foreground">
                <span className="font-medium">{report.description}</span>
                {" · "}
                <StatusBadge value={report.priority} />
                {" · "}
                <StatusBadge value={report.status} />
              </div>
            ))}
          </div>
        ) : null}

        {canManage ? (
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => onEdit(room)}>
              Edit tent details
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Remove tent ${room.room_number}`}
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(room)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface BedSlotProps {
  label: string;
  occupied: boolean;
  name: string | null;
  canOperate: boolean;
  onAssign: () => void;
  onRemove?: (() => void) | undefined;
}

function BedSlot({ label, occupied, name, canOperate, onAssign, onRemove }: BedSlotProps) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
      <div>
        <span className="text-xs font-medium text-muted-foreground">{label}: </span>
        <span className={occupied ? "font-medium" : "italic text-muted-foreground"}>
          {name ?? "Empty"}
        </span>
      </div>
      {canOperate ? (
        <div className="flex gap-1">
          {!occupied ? (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onAssign}>
              Assign Staff
            </Button>
          ) : onRemove ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              Remove Staff
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

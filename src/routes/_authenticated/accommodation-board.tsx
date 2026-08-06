import { useState, type KeyboardEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BedDouble, Sparkles, Wrench, Users } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { RecordDialog, type RecordValues } from "@/components/RecordDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { isActiveOn, today, useList, useSave } from "@/lib/data";
import { cn } from "@/lib/utils";
import type {
  AllocationRow,
  HousekeepingRow,
  MaintenanceRow,
  RoomRow,
  TeamMemberRow,
} from "@/lib/types";

export const Route = createFileRoute("/_authenticated/accommodation-board")({
  head: () => ({
    meta: [
      { title: "Accommodation Board — Ten of Cups Camp Manager" },
      {
        name: "description",
        content: "A mobile-friendly view of current tent status, guests, cleaning and maintenance.",
      },
      { property: "og:title", content: "Accommodation Board — Ten of Cups Camp Manager" },
      {
        property: "og:description",
        content: "Track every tent in real time for the private safari camp.",
      },
    ],
  }),
  component: AccommodationBoardPage,
});

type AllocationAction = "allocate" | "move" | "remove" | null;
type BedKey = "bed_a" | "bed_b";

function AccommodationBoardPage() {
  const { canOperate } = useAuth();
  const day = today();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: rooms = [] } = useList<RoomRow>(
    "rooms",
    "*, buildings(name, camps(name)), room_types(name)",
    "room_number",
  );
  const { data: allocations = [] } = useList<AllocationRow>(
    "allocations",
    "*, rooms(room_number, buildings(name, camps(name)))",
    "arrival_date",
  );
  const { data: cleaning = [] } = useList<HousekeepingRow>(
    "housekeeping_tasks",
    "*, rooms(room_number, buildings(name)), team_members(name, surname)",
  );
  const { data: maintenance = [] } = useList<MaintenanceRow>(
    "maintenance_reports",
    "*, rooms(room_number, buildings(name))",
  );
  const { data: members = [] } = useList<TeamMemberRow>("team_members", "*", "surname");

  const saveAllocation = useSave("allocations", "Allocation");
  const saveHousekeeping = useSave("housekeeping_tasks", "Cleaning task");
  const saveMaintenance = useSave("maintenance_reports", "Maintenance report");
  const saveRoom = useSave("rooms", "Room");

  const [selectedRoom, setSelectedRoom] = useState<RoomRow | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [allocationAction, setAllocationAction] = useState<AllocationAction>(null);
  const [allocationBed, setAllocationBed] = useState<BedKey>("bed_a");
  const [filter, setFilter] = useState<"all" | "occupied" | "needs-cleaning" | "maintenance">(
    "all",
  );

  const activeAllocations = allocations.filter((a) => isActiveOn(a, day));
  const activeByRoom = new Map(activeAllocations.map((a) => [a.room_id, a]));
  const cleaningByRoom = new Map(cleaning.map((task) => [task.room_id, task]));
  const maintenanceByRoom = new Map(
    maintenance
      .filter((report) => report.status !== "completed")
      .map((report) => [report.room_id, report]),
  );

  const occupiedBedCount = rooms.reduce((total, room) => {
    const current = activeByRoom.get(room.id);
    return total + getOccupancyCount(current);
  }, 0);
  const totalBedCapacity = rooms.reduce((total, room) => total + getBedCount(room), 0);
  const occupiedTentCount = rooms.filter(
    (room) => getOccupancyCount(activeByRoom.get(room.id)) > 0,
  ).length;

  const summary = [
    {
      label: "Occupancy",
      value: `${rooms.length && totalBedCapacity ? Math.round((occupiedBedCount / totalBedCapacity) * 100) : 0}%`,
    },
    { label: "Occupied tents", value: `${occupiedTentCount}` },
    { label: "Cleaning", value: `${cleaning.filter((task) => task.status !== "ready").length}` },
    {
      label: "Maintenance",
      value: `${maintenance.filter((report) => report.status !== "completed").length}`,
    },
  ];

  const attentionRooms = orderedRooms
    .filter((room) => {
      const current = activeByRoom.get(room.id);
      const cleaningTask = cleaningByRoom.get(room.id);
      const maintenanceIssue = maintenanceByRoom.get(room.id);
      const occupancy = getOccupancyCount(current);
      const bedCount = getBedCount(room);

      return (
        Boolean(maintenanceIssue) ||
        cleaningTask?.status === "to_clean" ||
        cleaningTask?.status === "in_progress" ||
        occupancy >= bedCount ||
        occupancy > 0
      );
    })
    .slice(0, 3);

  const staffOptions = members.map((member) => ({
    value: member.id,
    label: `${member.name} ${member.surname}`,
  }));

  const orderedRooms = [...rooms].sort((left, right) => {
    const leftState = getRoomPriority(
      left,
      activeByRoom.get(left.id),
      cleaningByRoom.get(left.id),
      maintenanceByRoom.get(left.id),
    );
    const rightState = getRoomPriority(
      right,
      activeByRoom.get(right.id),
      cleaningByRoom.get(right.id),
      maintenanceByRoom.get(right.id),
    );

    return leftState - rightState || left.room_number.localeCompare(right.room_number);
  });

  const visibleRooms = orderedRooms.filter((room) => {
    const current = activeByRoom.get(room.id);
    const cleaningTask = cleaningByRoom.get(room.id);
    const maintenanceIssue = maintenanceByRoom.get(room.id);
    const occupancy = getOccupancyCount(current);

    if (filter === "occupied") return occupancy > 0;
    if (filter === "needs-cleaning")
      return cleaningTask?.status === "to_clean" || cleaningTask?.status === "in_progress";
    if (filter === "maintenance") return Boolean(maintenanceIssue);
    return true;
  });

  const openRoomActions = (room: RoomRow) => {
    setSelectedRoom(room);
    setActionOpen(true);
  };

  const closeDialogs = () => {
    setActionOpen(false);
    setAllocationDialogOpen(false);
    setAllocationAction(null);
    setSelectedRoom(null);
  };

  const openAllocationDialog = (room: RoomRow, action: AllocationAction, bed: BedKey) => {
    setSelectedRoom(room);
    setAllocationAction(action);
    setAllocationBed(bed);
    setActionOpen(false);
    setAllocationDialogOpen(true);
  };

  const handleRemoveStaff = (room: RoomRow) => {
    const current = activeByRoom.get(room.id);
    if (!current) return;
    saveAllocation.mutate(
      {
        id: current.id,
        room_id: room.id,
        arrival_date: current.arrival_date,
        departure_date: current.departure_date,
        bed_a: null,
        bed_b: null,
        bed_a_name: null,
        bed_b_name: null,
        department: current.department,
        comments: current.comments,
        status: "cancelled",
      },
      { onSuccess: () => closeDialogs() },
    );
  };

  const handleMarkClean = (room: RoomRow) => {
    const existing = cleaningByRoom.get(room.id);
    saveHousekeeping.mutate(
      {
        id: existing?.id,
        room_id: room.id,
        status: "ready",
        assigned_to: existing?.assigned_to ?? null,
        notes: existing?.notes ?? "Marked clean from accommodation board",
      },
      {
        onSuccess: () => {
          saveRoom.mutate({ id: room.id, status: "available" });
          closeDialogs();
        },
      },
    );
  };

  const handleMarkDirty = (room: RoomRow) => {
    const existing = cleaningByRoom.get(room.id);
    saveHousekeeping.mutate(
      {
        id: existing?.id,
        room_id: room.id,
        status: "to_clean",
        assigned_to: existing?.assigned_to ?? null,
        notes: existing?.notes ?? "Marked dirty from accommodation board",
      },
      {
        onSuccess: () => {
          saveRoom.mutate({ id: room.id, status: "cleaning_required" });
          closeDialogs();
        },
      },
    );
  };

  const handleReportMaintenance = (room: RoomRow) => {
    const existing = maintenanceByRoom.get(room.id);
    saveMaintenance.mutate(
      {
        id: existing?.id,
        room_id: room.id,
        reported_by: existing?.reported_by ?? null,
        priority: existing?.priority ?? "high",
        description: existing?.description ?? "Reported from accommodation board",
        status: "open",
        completed_date: null,
      },
      {
        onSuccess: () => {
          saveRoom.mutate({ id: room.id, status: "out_of_service" });
          closeDialogs();
        },
      },
    );
  };

  const handleCompleteMaintenance = (room: RoomRow) => {
    const existing = maintenanceByRoom.get(room.id);
    saveMaintenance.mutate(
      {
        id: existing?.id,
        room_id: room.id,
        reported_by: existing?.reported_by ?? null,
        priority: existing?.priority ?? "high",
        description: existing?.description ?? "Maintenance completed from accommodation board",
        status: "completed",
        completed_date: day,
      },
      {
        onSuccess: () => {
          saveRoom.mutate({ id: room.id, status: "cleaning_required" });
          closeDialogs();
        },
      },
    );
  };

  const handleAllocationSubmit = (values: RecordValues) => {
    if (!selectedRoom) return;
    const current = activeByRoom.get(selectedRoom.id);
    const selectedBed = values.bed as BedKey;
    const chosenStaff = values.staff_id as string | null;
    const staffName = members.find((member) => member.id === chosenStaff)
      ? `${members.find((member) => member.id === chosenStaff)?.name} ${members.find((member) => member.id === chosenStaff)?.surname}`
      : null;

    const nextBedA = selectedBed === "bed_a" ? (chosenStaff ?? null) : (current?.bed_a ?? null);
    const nextBedB = selectedBed === "bed_b" ? (chosenStaff ?? null) : (current?.bed_b ?? null);
    const nextBedAName =
      selectedBed === "bed_a" ? (staffName ?? null) : (current?.bed_a_name ?? null);
    const nextBedBName =
      selectedBed === "bed_b" ? (staffName ?? null) : (current?.bed_b_name ?? null);

    saveAllocation.mutate(
      {
        id: current?.id,
        room_id: selectedRoom.id,
        arrival_date: current?.arrival_date ?? day,
        departure_date: current?.departure_date ?? tomorrow,
        bed_a: nextBedA,
        bed_b: nextBedB,
        bed_a_name: nextBedAName,
        bed_b_name: nextBedBName,
        department: current?.department ?? null,
        comments: current?.comments ?? null,
        status: current?.status ?? "checked_in",
      },
      { onSuccess: () => closeDialogs() },
    );
  };

  const selectedAllocation = selectedRoom ? activeByRoom.get(selectedRoom.id) : undefined;
  const selectedCleaning = selectedRoom ? cleaningByRoom.get(selectedRoom.id) : undefined;
  const selectedMaintenance = selectedRoom ? maintenanceByRoom.get(selectedRoom.id) : undefined;
  const selectedOccupancy = getOccupancyCount(selectedAllocation);
  const selectedBedCount = selectedRoom ? getBedCount(selectedRoom) : 0;
  const hasActiveAllocation = Boolean(selectedAllocation);
  const isCleanReady = selectedCleaning?.status === "ready";
  const hasOpenMaintenance = Boolean(
    selectedMaintenance && ["open", "in_progress"].includes(selectedMaintenance.status),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accommodation Board"
        subtitle="The primary operational view for tents, occupancy, assignments, cleaning and maintenance."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label} className="shadow-lodge">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="font-display text-3xl">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "All tents" },
          { value: "occupied", label: "Occupied" },
          { value: "needs-cleaning", label: "Needs cleaning" },
          { value: "maintenance", label: "Maintenance" },
        ].map((option) => (
          <Button
            key={option.value}
            variant={filter === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(option.value as typeof filter)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {attentionRooms.length ? (
        <Card className="shadow-lodge">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Needs attention</p>
                <p className="text-sm text-muted-foreground">
                  The tents that need the most immediate follow-up today.
                </p>
              </div>
              <Badge variant="outline">Priority view</Badge>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {attentionRooms.map((room) => {
                const current = activeByRoom.get(room.id);
                const cleaningTask = cleaningByRoom.get(room.id);
                const maintenanceIssue = maintenanceByRoom.get(room.id);
                const occupancy = getOccupancyCount(current);

                return (
                  <div
                    key={room.id}
                    className="rounded-lg border border-border bg-background/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{room.room_number}</p>
                      <Badge variant="outline">{occupancy > 0 ? "Occupied" : "Open"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {room.buildings?.name ?? "Unassigned block"}
                    </p>
                    <p className="mt-2 text-sm">
                      Occupancy {occupancy}/{getBedCount(room)} ·{" "}
                      {maintenanceIssue ? "Maintenance" : "Ready"}
                    </p>
                    {cleaningTask ? (
                      <p className="text-sm text-muted-foreground">
                        Cleaning: {cleaningTask.status.replace(/_/g, " ")}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {visibleRooms.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleRooms.map((room) => {
            const current = activeByRoom.get(room.id);
            const cleaningTask = cleaningByRoom.get(room.id);
            const maintenanceIssue = maintenanceByRoom.get(room.id);
            const occupancy = getOccupancyCount(current);
            const bedCount = getBedCount(room);
            const assignedStaff = getAssignedStaff(current, members);
            const cardTone = getCardTone(room, occupancy, cleaningTask, maintenanceIssue);

            return (
              <Card
                key={room.id}
                className={cn(
                  "shadow-lodge cursor-pointer transition-transform hover:-translate-y-0.5",
                  cardTone,
                )}
                onClick={() => (canOperate ? openRoomActions(room) : undefined)}
                onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (canOperate) openRoomActions(room);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{room.room_number}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {room.buildings?.name ?? "Unassigned block"} ·{" "}
                        {room.buildings?.camps?.name ?? "Unassigned camp"}
                      </p>
                    </div>
                    <StatusBadge value={room.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{getTentType(room)}</Badge>
                    <Badge variant="outline">
                      {bedCount} bed{bedCount === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant={occupancy > 0 ? "default" : "secondary"}>
                      {occupancy > 0 ? "Occupied" : "Available"}
                    </Badge>
                  </div>

                  <div className="grid gap-2">
                    <InfoRow label="Camp" value={room.buildings?.camps?.name ?? "Unassigned"} />
                    <InfoRow label="Block" value={room.buildings?.name ?? "Unassigned"} />
                    <InfoRow label="Tent Type" value={getTentType(room)} />
                    <InfoRow label="Beds" value={`${bedCount}`} />
                    <InfoRow label="Current Occupancy" value={`${occupancy}/${bedCount}`} />
                    <InfoRow
                      label="Staff Assigned"
                      value={assignedStaff.length ? assignedStaff.join(" · ") : "No staff assigned"}
                    />
                    <InfoRow
                      label="Cleaning Status"
                      value={cleaningTask ? cleaningTask.status.replace(/_/g, " ") : "Ready"}
                    />
                    <InfoRow
                      label="Maintenance Status"
                      value={
                        maintenanceIssue ? maintenanceIssue.status.replace(/_/g, " ") : "Clear"
                      }
                    />
                  </div>

                  {isTwinTent(room) ? (
                    <div className="space-y-2">
                      <div className="rounded-lg border border-border p-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Bed A
                        </p>
                        <p className="mt-1 font-medium">
                          {getBedLabel(current, "bed_a", members) || "Empty"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border p-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Bed B
                        </p>
                        <p className="mt-1 font-medium">
                          {getBedLabel(current, "bed_b", members) || "Empty"}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-lodge">
          <CardContent className="pt-6">
            <p className="font-medium">No tents match this view.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try switching the filter to see the full board again.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={actionOpen}
        onOpenChange={(open) => (!open ? closeDialogs() : setActionOpen(true))}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {selectedRoom ? selectedRoom.room_number : "Tent actions"}
            </DialogTitle>
            <DialogDescription>
              Manage staff, cleaning and maintenance for this tent without leaving the board.
            </DialogDescription>
          </DialogHeader>
          {selectedRoom ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Current tent status
              </p>
              <p className="mt-1 font-medium">
                Occupancy {selectedOccupancy}/{selectedBedCount} ·{" "}
                {selectedCleaning ? selectedCleaning.status.replace(/_/g, " ") : "Ready"} ·{" "}
                {selectedMaintenance ? selectedMaintenance.status.replace(/_/g, " ") : "Clear"}
              </p>
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() =>
                selectedRoom && openAllocationDialog(selectedRoom, "allocate", "bed_a")
              }
              disabled={!canOperate || !selectedRoom}
            >
              Allocate Staff
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedRoom && openAllocationDialog(selectedRoom, "move", "bed_a")}
              disabled={!canOperate || !selectedRoom}
            >
              Move Staff
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedRoom && handleRemoveStaff(selectedRoom)}
              disabled={!canOperate || !selectedRoom || !hasActiveAllocation}
            >
              Remove Staff
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedRoom && handleMarkClean(selectedRoom)}
              disabled={!canOperate || !selectedRoom || isCleanReady}
            >
              Mark Clean
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedRoom && handleMarkDirty(selectedRoom)}
              disabled={!canOperate || !selectedRoom}
            >
              Mark Dirty
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedRoom && handleReportMaintenance(selectedRoom)}
              disabled={!canOperate || !selectedRoom || hasOpenMaintenance}
            >
              Report Maintenance
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedRoom && handleCompleteMaintenance(selectedRoom)}
              disabled={!canOperate || !selectedRoom || !hasOpenMaintenance}
            >
              Complete Maintenance
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialogs}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecordDialog
        open={allocationDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAllocationDialogOpen(false);
            setAllocationAction(null);
            setSelectedRoom(null);
          } else {
            setAllocationDialogOpen(true);
          }
        }}
        title={allocationAction === "move" ? "Move staff" : "Allocate staff"}
        description="Assign or reassign a staff member to a bed on this tent."
        initial={{
          bed: allocationBed,
          staff_id: selectedRoom
            ? getDefaultStaffId(activeByRoom.get(selectedRoom.id), allocationBed)
            : null,
        }}
        submitting={saveAllocation.isPending}
        fields={[
          {
            name: "bed",
            label: "Bed",
            type: "select",
            required: true,
            options: [
              { value: "bed_a", label: "Bed A" },
              { value: "bed_b", label: "Bed B" },
            ],
          },
          {
            name: "staff_id",
            label: "Staff member",
            type: "select",
            required: true,
            options: staffOptions,
          },
        ]}
        onSubmit={handleAllocationSubmit}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-2">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function getTentType(room: RoomRow) {
  return room.bed_configuration === "single" ? "Single" : "Twin";
}

function isTwinTent(room: RoomRow) {
  return room.bed_configuration === "twin";
}

function getBedCount(room: RoomRow) {
  return room.bed_configuration === "single"
    ? 1
    : room.bed_configuration === "twin"
      ? 2
      : room.max_occupancy;
}

function getOccupancyCount(allocation: AllocationRow | undefined) {
  if (!allocation) return 0;

  const explicitBeds = [allocation.bed_a, allocation.bed_b].filter(Boolean).length;
  if (explicitBeds > 0) return explicitBeds;

  return [allocation.bed_a_name, allocation.bed_b_name].filter(Boolean).length;
}

function getAssignedStaff(allocation: AllocationRow | undefined, members: TeamMemberRow[]) {
  const names = [
    getBedLabel(allocation, "bed_a", members),
    getBedLabel(allocation, "bed_b", members),
  ].filter(Boolean);
  return names;
}

function getBedLabel(allocation: AllocationRow | undefined, bed: BedKey, members: TeamMemberRow[]) {
  const memberId = bed === "bed_a" ? allocation?.bed_a : allocation?.bed_b;
  const memberName = bed === "bed_a" ? allocation?.bed_a_name : allocation?.bed_b_name;
  if (memberId) {
    const member = members.find((item) => item.id === memberId);
    return member ? `${member.name} ${member.surname}` : (memberName ?? "Assigned");
  }
  return memberName ?? null;
}

function getDefaultStaffId(allocation: AllocationRow | undefined, bed: BedKey) {
  return bed === "bed_a" ? (allocation?.bed_a ?? null) : (allocation?.bed_b ?? null);
}

function getCardTone(
  room: RoomRow,
  occupancy: number,
  cleaningTask: HousekeepingRow | undefined,
  maintenanceIssue: MaintenanceRow | undefined,
) {
  if (maintenanceIssue) {
    return "border border-border/70 bg-muted/60";
  }
  if (cleaningTask?.status === "to_clean" || cleaningTask?.status === "in_progress") {
    return "border border-orange-500/50 bg-orange-500/10";
  }
  if (occupancy >= getBedCount(room)) {
    return "border border-red-500/50 bg-red-500/10";
  }
  if (occupancy > 0) {
    return "border border-yellow-500/50 bg-yellow-500/10";
  }
  return "border border-green-600/40 bg-green-600/10";
}

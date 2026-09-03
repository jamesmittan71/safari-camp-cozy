import { useEffect, useMemo, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ImagePlus, MapPinned, Pencil, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { isActiveOn, today, useList } from "@/lib/data";
import type { AllocationRow, CampRow, HousekeepingRow, MaintenanceRow, RoomRow } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/camp-map")({
  head: () => ({
    meta: [{ title: "Camp Status Map - Ten of Cups Camp Manager" }],
  }),
  component: CampMapPage,
});

const OPEN_MAINTENANCE = new Set([
  "reported",
  "assigned",
  "in_progress",
  "waiting_for_parts",
  "inspection",
]);
const OPEN_HOUSEKEEPING = new Set(["dirty", "scheduled", "in_progress", "inspection"]);

const MAP_STATUS = {
  maintenance: { label: "Out of service", className: "bg-red-600 text-white" },
  dirty: { label: "Dirty / cleaning", className: "bg-amber-400 text-amber-950" },
  occupied: { label: "Occupied", className: "bg-emerald-600 text-white" },
  vacant: { label: "Vacant", className: "bg-sky-600 text-white" },
} as const;

type MapStatus = keyof typeof MAP_STATUS;

function roomStatus(
  room: RoomRow,
  allocations: AllocationRow[],
  housekeeping: HousekeepingRow[],
  maintenance: MaintenanceRow[],
  date: string,
): MapStatus {
  // Operational precedence: maintenance/out of service, then cleaning, occupancy, then vacant.
  const hasMaintenance =
    room.status === "out_of_service" ||
    room.status === "maintenance" ||
    maintenance.some((report) => report.room_id === room.id && OPEN_MAINTENANCE.has(report.status));
  if (hasMaintenance) return "maintenance";
  if (
    room.status === "cleaning_required" ||
    housekeeping.some((task) => task.room_id === room.id && OPEN_HOUSEKEEPING.has(task.status))
  ) {
    return "dirty";
  }
  return allocations.some(
    (allocation) => allocation.room_id === room.id && isActiveOn(allocation, date),
  )
    ? "occupied"
    : "vacant";
}

function guestSummary(allocation: AllocationRow | undefined) {
  if (!allocation) return "No current allocation";
  const guests = [allocation.bed_a_name, allocation.bed_b_name].filter(Boolean).join(", ");
  return guests || allocation.department || "Allocated room";
}

function CampMapPage() {
  const { canManage } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const { data: camps = [], error: campsError } = useList<CampRow>("camps", "*", "name");
  const { data: rooms = [], error: roomsError } = useList<RoomRow>(
    "rooms",
    "*, buildings!rooms_building_id_fkey(camp_id, name)",
    "room_number",
  );
  const { data: allocations = [], error: allocationsError } = useList<AllocationRow>(
    "allocations",
    "*, rooms!allocations_room_id_fkey(room_number)",
    "arrival_date",
  );
  const { data: housekeeping = [], error: housekeepingError } = useList<HousekeepingRow>(
    "housekeeping_tasks",
    "*",
    "created_at",
  );
  const { data: maintenance = [], error: maintenanceError } = useList<MaintenanceRow>(
    "maintenance_reports",
    "*",
    "created_at",
  );
  const [campId, setCampId] = useState("");
  const [date, setDate] = useState(today());
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomRow | null>(null);
  const [placingRoomId, setPlacingRoomId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [movingRoomId, setMovingRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!campId && camps[0]) setCampId(camps[0].id);
  }, [campId, camps]);

  const selectedCamp = camps.find((camp) => camp.id === campId) ?? null;
  const campRooms = useMemo(
    () => rooms.filter((room) => room.buildings?.camp_id === campId),
    [campId, rooms],
  );
  const positionedRooms = campRooms.filter((room) => room.map_x !== null && room.map_y !== null);
  const queryError =
    campsError ?? roomsError ?? allocationsError ?? housekeepingError ?? maintenanceError;

  const mapPosition = (event: React.PointerEvent<HTMLElement>) => {
    const bounds = mapRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      map_x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
      map_y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)),
    };
  };

  const savePosition = async (roomId: string, event: React.PointerEvent<HTMLElement>) => {
    const position = mapPosition(event);
    if (!position) return;
    const { error } = await supabase.from("rooms").update(position).eq("id", roomId);
    if (error) {
      toast.error(`Could not save marker: ${error.message}`);
      return;
    }
    await supabase.from("rooms").select("id").eq("id", roomId);
    window.location.reload();
  };

  const handleMapClick = async (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editorOpen || movingRoomId) return;
    if (!placingRoomId) {
      toast.message("Select an unplaced tent from the editor list, then tap the map to place it.");
      return;
    }
    await savePosition(placingRoomId, event);
    setPlacingRoomId(null);
  };

  const uploadMap = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCamp) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file for the camp map.");
      return;
    }
    setUploading(true);
    const path = `${selectedCamp.id}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("camp-maps").upload(path, file, {
      upsert: false,
    });
    if (uploadError) {
      toast.error(`Map upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("camp-maps").getPublicUrl(path);
    const { error: updateError } = await supabase
      .from("camps")
      .update({ map_image_path: data.publicUrl })
      .eq("id", selectedCamp.id);
    setUploading(false);
    if (updateError) {
      toast.error(`Could not save map image: ${updateError.message}`);
      return;
    }
    window.location.reload();
  };

  const clearMap = async () => {
    if (!selectedCamp) return;
    const { error } = await supabase
      .from("camps")
      .update({ map_image_path: null })
      .eq("id", selectedCamp.id);
    if (error) {
      toast.error(`Could not clear map image: ${error.message}`);
      return;
    }
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Camp Status Map"
        subtitle="Live tent status for the selected operational date."
        action={
          canManage ? (
            <Button
              variant={editorOpen ? "secondary" : "outline"}
              onClick={() => setEditorOpen(!editorOpen)}
            >
              <Pencil className="size-4" /> {editorOpen ? "Close editor" : "Edit map"}
            </Button>
          ) : null
        }
      />

      {queryError ? (
        <Alert variant="destructive">
          <AlertTitle>Map data could not be loaded</AlertTitle>
          <AlertDescription>{queryError.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-end gap-4">
        <label className="grid gap-1 text-sm font-medium">
          Camp
          <select
            value={campId}
            onChange={(event) => {
              setCampId(event.target.value);
              setSelectedRoom(null);
            }}
            className="h-10 min-w-52 rounded-md border border-input bg-background px-3 text-sm"
          >
            {camps.map((camp) => (
              <option key={camp.id} value={camp.id}>
                {camp.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Operational date
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        {canManage && selectedCamp ? (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadMap}
            />
            <Button
              variant="outline"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-4" />{" "}
              {selectedCamp.map_image_path ? "Replace map" : "Upload map"}
            </Button>
            {selectedCamp.map_image_path ? (
              <Button variant="outline" onClick={clearMap}>
                <X className="size-4" /> Clear image
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="overflow-hidden shadow-lodge">
          <CardContent className="overflow-x-auto p-0">
            <div
              ref={mapRef}
              className="relative min-h-96 min-w-[42rem] overflow-hidden bg-muted sm:min-w-0"
              onPointerDown={handleMapClick}
            >
              {selectedCamp?.map_image_path ? (
                <img
                  src={selectedCamp.map_image_path}
                  alt={`Overhead map of ${selectedCamp.name}`}
                  className="block h-auto w-full select-none"
                  draggable={false}
                />
              ) : (
                <div className="flex min-h-96 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <MapPinned className="size-10" />
                  <p>No map image has been uploaded for this camp.</p>
                </div>
              )}
              {positionedRooms.map((room) => {
                const status = roomStatus(room, allocations, housekeeping, maintenance, date);
                return (
                  <button
                    key={room.id}
                    type="button"
                    aria-label={`${room.room_number}: ${MAP_STATUS[status].label}`}
                    className={`absolute z-10 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-xs font-bold shadow-md ${MAP_STATUS[status].className}`}
                    style={{ left: `${room.map_x}%`, top: `${room.map_y}%` }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      if (editorOpen) setMovingRoomId(room.id);
                    }}
                    onPointerUp={async (event) => {
                      if (movingRoomId === room.id) {
                        event.stopPropagation();
                        setMovingRoomId(null);
                        await savePosition(room.id, event);
                      } else {
                        setSelectedRoom(room);
                      }
                    }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    {room.room_number}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-lodge">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status legend</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {Object.entries(MAP_STATUS).map(([key, status]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`size-3 rounded-full ${status.className}`} />
                  {status.label}
                </div>
              ))}
            </CardContent>
          </Card>

          {selectedRoom
            ? (() => {
                const allocation = allocations.find(
                  (item) => item.room_id === selectedRoom.id && isActiveOn(item, date),
                );
                const status = roomStatus(
                  selectedRoom,
                  allocations,
                  housekeeping,
                  maintenance,
                  date,
                );
                return (
                  <Card className="shadow-lodge">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Tent {selectedRoom.room_number}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p>
                        <span className="font-medium">Status:</span> {MAP_STATUS[status].label}
                      </p>
                      <p>
                        <span className="font-medium">Allocation:</span> {guestSummary(allocation)}
                      </p>
                      <div className="flex gap-3 text-primary underline">
                        <Link to="/rooms">Open rooms</Link>
                        <Link to="/allocations">Open allocations</Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()
            : null}

          {editorOpen ? (
            <Card className="shadow-lodge">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Marker editor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Select an unplaced tent, then tap the map to place it. Drag an existing marker to
                  reposition it.
                </p>
                {campRooms
                  .filter((room) => room.map_x === null || room.map_y === null)
                  .map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left ${placingRoomId === room.id ? "border-primary bg-primary/10" : "border-border"}`}
                      onClick={() => setPlacingRoomId(room.id)}
                    >
                      <span>{room.room_number}</span>
                      <span className="text-muted-foreground">Unplaced</span>
                    </button>
                  ))}
                {campRooms.every((room) => room.map_x !== null && room.map_y !== null) ? (
                  <p className="text-muted-foreground">All tents are placed.</p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

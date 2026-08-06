import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BedDouble,
  Building2,
  CalendarCheck,
  CalendarX,
  ClipboardList,
  Sparkles,
  Tent,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { isActiveOn, today, useList, useSave } from "@/lib/data";
import { OccupancyCalendar } from "@/components/OccupancyCalendar";
import type { AllocationRow, HousekeepingRow, RoomRow } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Ten of Cups Camp Manager" },
      {
        name: "description",
        content: "Live camp occupancy, arrivals, departures, cleaning and maintenance overview.",
      },
      { property: "og:title", content: "Dashboard — Ten of Cups Camp Manager" },
      {
        property: "og:description",
        content: "Live occupancy and operations overview for the game farm.",
      },
    ],
  }),
  component: Dashboard,
});

function Stat({
  icon: Icon,
  label,
  value,
  tone = "text-accent",
}: {
  icon: typeof Tent;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="surface-lodge p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-wide uppercase text-muted-foreground">{label}</p>
        <Icon className={`size-4 ${tone}`} />
      </div>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </div>
  );
}

function Dashboard() {
  const day = today();
  const { canOperate } = useAuth();
  const { data: camps = [] } = useList("camps");
  const { data: buildings = [] } = useList("buildings");
  const { data: rooms = [] } = useList<RoomRow>("rooms", "*, buildings(name, camps(name))");
  const { data: allocations = [] } = useList<AllocationRow>(
    "allocations",
    "*, rooms(room_number, buildings(name, camps(name)))",
  );
  const saveRoom = useSave("rooms", "Room");
  const saveAllocation = useSave("allocations", "Allocation");
  const { data: hkTasks = [] } = useList<HousekeepingRow>(
    "housekeeping_tasks",
    "room_id, status, date_completed",
  );

  const count = (status: string) => rooms.filter((r) => r.status === status).length;
  const hkCount = (status: string) => hkTasks.filter((t) => t.status === status).length;
  const arrivals = allocations.filter((a) => a.arrival_date === day && a.status !== "cancelled");
  const departures = allocations.filter(
    (a) => a.departure_date === day && a.status !== "cancelled",
  );
  const occupiedNow = allocations.filter((a) => isActiveOn(a, day));
  const cleaning = rooms.filter((r) => r.status === "cleaning_required");
  const overdueHk = hkTasks.filter(
    (t) =>
      t.date_assigned !== null &&
      t.date_assigned < day &&
      t.status !== "clean" &&
      t.status !== "out_of_service",
  );

  return (
    <div>
      <PageHeader
        title="Operations Dashboard"
        subtitle={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Tent} label="Total Camps" value={camps.length} />
        <Stat icon={Building2} label="Total Buildings" value={buildings.length} />
        <Stat icon={BedDouble} label="Total Rooms" value={rooms.length} />
        <Stat
          icon={BedDouble}
          label="Available Rooms"
          value={count("available")}
          tone="text-status-available"
        />
        <Stat
          icon={ClipboardList}
          label="Occupied Rooms"
          value={count("occupied")}
          tone="text-status-occupied"
        />
        <Stat
          icon={Sparkles}
          label="Dirty Tents"
          value={hkCount("dirty")}
          tone="text-status-cleaning"
        />
        <Stat
          icon={Sparkles}
          label="Cleaning In Progress"
          value={hkCount("cleaning_in_progress")}
          tone="text-status-occupied"
        />
        <Stat
          icon={Sparkles}
          label="Inspection Required"
          value={hkCount("inspection_required")}
          tone="text-status-maintenance"
        />
        <Stat
          icon={Sparkles}
          label="Overdue Cleaning"
          value={overdueHk.length}
          tone="text-destructive"
        />
        <Stat
          icon={Wrench}
          label="Under Maintenance"
          value={count("out_of_service")}
          tone="text-status-maintenance"
        />
        <Stat icon={ClipboardList} label="Guests In Camp" value={occupiedNow.length} />
        <Stat
          icon={CalendarCheck}
          label="Arrivals Today"
          value={arrivals.length}
          tone="text-status-available"
        />
        <Stat
          icon={CalendarX}
          label="Departures Today"
          value={departures.length}
          tone="text-status-cleaning"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="surface-lodge p-5">
          <h2 className="font-display text-xl">Quick Actions</h2>
          <div className="mt-3 grid gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link to="/allocations">Allocate Room</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/allocations">Create Booking</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/housekeeping">Mark Room Clean</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/calendar">View Calendar</Link>
            </Button>
          </div>
        </div>

        <div className="surface-lodge p-5">
          <h2 className="font-display text-xl">Departures Today</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {departures.length === 0 ? (
              <li className="text-muted-foreground">No departures today.</li>
            ) : (
              departures.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
                >
                  <span>
                    Room {a.rooms?.room_number} · {a.bed_a_name ?? "—"}
                  </span>
                  {canOperate && a.status !== "checked_out" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        saveAllocation.mutate({ id: a.id, status: "checked_out" });
                        if (a.room_id)
                          saveRoom.mutate({ id: a.room_id, status: "cleaning_required" });
                      }}
                    >
                      Check out
                    </Button>
                  ) : (
                    <StatusBadge value={a.status} />
                  )}
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="surface-lodge p-5">
          <h2 className="font-display text-xl">Rooms Awaiting Cleaning</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {cleaning.length === 0 ? (
              <li className="text-muted-foreground">Every room is clean.</li>
            ) : (
              cleaning.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
                >
                  <span>
                    Room {r.room_number} · {r.buildings?.name}
                  </span>
                  {canOperate ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => saveRoom.mutate({ id: r.id, status: "available" })}
                    >
                      Mark clean
                    </Button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-2xl">Occupancy Calendar</h2>
        <OccupancyCalendar rooms={rooms} allocations={allocations} />
      </div>
    </div>
  );
}

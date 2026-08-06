import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isActiveOn } from "@/lib/data";
import type { AllocationRow, RoomRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function OccupancyCalendar({
  rooms,
  allocations,
}: {
  rooms: RoomRow[];
  allocations: AllocationRow[];
}) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7;
    const out: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d += 1) {
      out.push(iso(new Date(cursor.getFullYear(), cursor.getMonth(), d)));
    }
    return out;
  }, [cursor]);

  const cleaningCount = rooms.filter((r) => r.status === "cleaning_required").length;
  const maintenanceCount = rooms.filter((r) => r.status === "out_of_service").length;
  const todayIso = iso(new Date());

  return (
    <div className="surface-lodge p-4">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous month"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="font-display text-xl">
          {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next month"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] tracking-wide uppercase text-muted-foreground">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} className="min-h-20 rounded-md bg-muted/30" />;
          const occupied = allocations.filter((a) => isActiveOn(a, day)).length;
          const available = Math.max(rooms.length - occupied - cleaningCount - maintenanceCount, 0);
          return (
            <div
              key={day}
              className={cn(
                "min-h-20 rounded-md border border-border p-1.5 text-left",
                day === todayIso ? "ring-2 ring-accent" : "",
              )}
            >
              <p className="text-xs font-medium">{Number(day.slice(-2))}</p>
              <div className="mt-1 space-y-0.5 text-[10px] leading-tight">
                {occupied > 0 ? (
                  <p className="rounded bg-status-occupied/15 px-1 text-status-occupied">
                    {occupied} occupied
                  </p>
                ) : null}
                {available > 0 ? (
                  <p className="rounded bg-status-available/15 px-1 text-status-available">
                    {available} available
                  </p>
                ) : null}
                {cleaningCount > 0 ? (
                  <p className="rounded bg-status-cleaning/15 px-1 text-status-cleaning">
                    {cleaningCount} cleaning
                  </p>
                ) : null}
                {maintenanceCount > 0 ? (
                  <p className="rounded bg-status-maintenance/15 px-1 text-status-maintenance">
                    {maintenanceCount} maint.
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-status-available" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-status-occupied" /> Occupied
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-status-cleaning" /> Cleaning Required
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-status-maintenance" /> Maintenance
        </span>
      </div>
    </div>
  );
}

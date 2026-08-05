import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { OccupancyCalendar } from "@/components/OccupancyCalendar";
import { useList } from "@/lib/data";
import type { AllocationRow, RoomRow } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Occupancy Calendar — Ten of Cups Camp Manager" },
      { name: "description", content: "Monthly occupancy calendar with colour-coded room availability." },
      { property: "og:title", content: "Occupancy Calendar — Ten of Cups Camp Manager" },
      { property: "og:description", content: "See camp occupancy day by day across the month." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { data: rooms = [] } = useList<RoomRow>("rooms");
  const { data: allocations = [] } = useList<AllocationRow>("allocations", "*", "arrival_date");

  return (
    <div>
      <PageHeader
        title="Occupancy Calendar"
        subtitle="Green available, blue occupied, orange cleaning required, red maintenance."
      />
      <OccupancyCalendar rooms={rooms} allocations={allocations} />
    </div>
  );
}

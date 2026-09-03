import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, LogIn, LogOut, Bed } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { RecordDialog, type RecordValues } from "@/components/RecordDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { isActiveOn, today, useList, useSave, useSoftDelete } from "@/lib/data";
import type { AllocationRow, RoomRow, TeamMemberRow } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/allocations")({
  head: () => ({
    meta: [
      { title: "Room Allocations — Ten of Cups Camp Manager" },
      {
        name: "description",
        content:
          "Allocate people to beds, manage arrivals and departures, prevent double bookings.",
      },
      { property: "og:title", content: "Room Allocations — Ten of Cups Camp Manager" },
      {
        property: "og:description",
        content: "Bookings and bed allocations for the game farm camps.",
      },
    ],
  }),
  component: AllocationsPage,
});

function AllocationsPage() {
  const { canOperate, user, session } = useAuth();
  const db = supabase;
  const { data: allocations = [], isLoading } = useList<AllocationRow>(
    "allocations",
    "*, rooms(room_number, buildings(name, camps(name)))",
    "arrival_date",
  );
  const { data: rooms = [] } = useList<RoomRow>(
    "rooms",
    "*, buildings(name, camps(name))",
    "room_number",
  );
  const { data: members = [] } = useList<TeamMemberRow>("team_members", "*", "surname");
  const save = useSave("allocations", "Allocation");
  const remove = useSoftDelete("allocations", "Allocation");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecordValues | undefined>();
  const [search, setSearch] = useState("");
  const [opsDate, setOpsDate] = useState(today());

  const day = today();
  const memberOptions = members.map((m) => ({ value: m.id, label: `${m.name} ${m.surname}` }));

  const rows = useMemo(
    () =>
      allocations.filter((a) => {
        const hay = `${a.rooms?.room_number ?? ""} ${a.bed_a_name ?? ""} ${a.bed_b_name ?? ""} ${a.department ?? ""}`;
        return hay.toLowerCase().includes(search.toLowerCase());
      }),
    [allocations, search],
  );

  // Operations view: filter by selected date
  const arrivalsToday = useMemo(
    () =>
      allocations.filter(
        (a) => a.arrival_date === opsDate && a.status !== "cancelled" && a.status !== "checked_out",
      ),
    [allocations, opsDate],
  );

  const departuresToday = useMemo(
    () =>
      allocations.filter(
        (a) =>
          a.departure_date === opsDate && a.status !== "cancelled" && a.status !== "checked_out",
      ),
    [allocations, opsDate],
  );

  const stayovers = useMemo(
    () =>
      allocations.filter(
        (a) =>
          isActiveOn(a, opsDate) &&
          a.arrival_date < opsDate &&
          a.departure_date > opsDate &&
          a.status !== "cancelled",
      ),
    [allocations, opsDate],
  );

  return (
    <div>
      <PageHeader
        title="Room Allocations"
        subtitle="Arrivals, departures and bed assignments. Overlapping bookings are blocked automatically."
        action={
          canOperate ? (
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> New allocation
            </Button>
          ) : null
        }
      />

      {/* Today's Operations View */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <label className="text-sm font-medium">Operations Date:</label>
          <input
            type="date"
            value={opsDate}
            onChange={(e) => setOpsDate(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          />
          <button
            onClick={() => setOpsDate(today())}
            className="text-xs underline text-blue-600 hover:text-blue-700"
          >
            Back to today
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Arrivals */}
          <Card className="shadow-lodge">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <LogIn className="size-4 text-green-600" />
                Arrivals ({arrivalsToday.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {arrivalsToday.length === 0 ? (
                <p className="text-sm text-muted-foreground">No arrivals scheduled</p>
              ) : (
                <ul className="space-y-2">
                  {arrivalsToday.map((a) => (
                    <li key={a.id} className="rounded bg-green-50 p-2 text-sm">
                      <div className="font-medium">{a.rooms?.room_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.bed_a_name || a.bed_b_name
                          ? `${a.bed_a_name || ""} ${a.bed_b_name || ""}`.trim()
                          : "No guests"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.rooms?.buildings?.camps?.name}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Departures */}
          <Card className="shadow-lodge">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <LogOut className="size-4 text-red-600" />
                Departures ({departuresToday.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {departuresToday.length === 0 ? (
                <p className="text-sm text-muted-foreground">No departures scheduled</p>
              ) : (
                <ul className="space-y-2">
                  {departuresToday.map((a) => (
                    <li key={a.id} className="rounded bg-red-50 p-2 text-sm">
                      <div className="font-medium">{a.rooms?.room_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.bed_a_name || a.bed_b_name
                          ? `${a.bed_a_name || ""} ${a.bed_b_name || ""}`.trim()
                          : "No guests"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.rooms?.buildings?.camps?.name}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Stayovers */}
          <Card className="shadow-lodge">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bed className="size-4 text-blue-600" />
                Stayovers ({stayovers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stayovers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No guests in-house</p>
              ) : (
                <ul className="space-y-2">
                  {stayovers.map((a) => (
                    <li key={a.id} className="rounded bg-blue-50 p-2 text-sm">
                      <div className="font-medium">{a.rooms?.room_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.bed_a_name || a.bed_b_name
                          ? `${a.bed_a_name || ""} ${a.bed_b_name || ""}`.trim()
                          : "No guests"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.rooms?.buildings?.camps?.name}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Input
        className="mb-4 max-w-sm"
        placeholder="Search by room, guest or department…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <DataTable<AllocationRow>
        loading={isLoading}
        rows={rows}
        empty="No allocations captured yet."
        columns={[
          { key: "room", label: "Room", render: (r) => r.rooms?.room_number ?? "—" },
          { key: "camp", label: "Camp", render: (r) => r.rooms?.buildings?.camps?.name ?? "—" },
          { key: "arrival_date", label: "Arrival" },
          { key: "departure_date", label: "Departure" },
          { key: "bed_a_name", label: "Bed A" },
          { key: "bed_b_name", label: "Bed B" },
          { key: "department", label: "Department" },
          {
            key: "status",
            label: "Status",
            render: (r) => <StatusBadge value={isActiveOn(r, day) ? "occupied" : r.status} />,
          },
          { key: "comments", label: "Comments" },
        ]}
        onEdit={
          canOperate
            ? (r) => {
                setEditing({ ...r } as RecordValues);
                setOpen(true);
              }
            : undefined
        }
        onDelete={canOperate ? (r) => remove.mutate(r.id) : undefined}
      />

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? "Edit allocation" : "New allocation"}
        description="Bed A and Bed B may be selected from the team register or captured as free text names."
        initial={editing}
        submitting={save.isPending}
        fields={[
          {
            name: "room_id",
            label: "Room",
            type: "select",
            required: true,
            options: rooms.map((r) => ({
              value: r.id,
              label: `${r.room_number} — ${r.buildings?.name ?? ""} (${r.buildings?.camps?.name ?? ""})`,
            })),
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "booked", label: "Booked" },
              { value: "checked_in", label: "Checked in" },
              { value: "checked_out", label: "Checked out" },
              { value: "cancelled", label: "Cancelled" },
            ],
          },
          { name: "arrival_date", label: "Arrival date", type: "date", required: true },
          { name: "departure_date", label: "Departure date", type: "date", required: true },
          { name: "bed_a", label: "Bed A (team member)", type: "select", options: memberOptions },
          { name: "bed_a_name", label: "Bed A name (if not staff)" },
          { name: "bed_b", label: "Bed B (team member)", type: "select", options: memberOptions },
          { name: "bed_b_name", label: "Bed B name (if not staff)" },
          { name: "department", label: "Department" },
          { name: "comments", label: "Comments", type: "textarea", full: true },
        ]}
        onSubmit={(values: RecordValues) => {
          const nameFor = (id?: string | null) => {
            const m = members.find((x) => x.id === id);
            return m ? `${m.name} ${m.surname}` : null;
          };
          save.mutate(
            {
              id: values.id,
              room_id: values.room_id,
              arrival_date: values.arrival_date,
              departure_date: values.departure_date,
              bed_a: values.bed_a ?? null,
              bed_b: values.bed_b ?? null,
              bed_a_name: values.bed_a_name ?? nameFor(values.bed_a),
              bed_b_name: values.bed_b_name ?? nameFor(values.bed_b),
              department: values.department,
              comments: values.comments,
              status: values.status ?? "booked",
            },
            {
              onSuccess: async () => {
                setOpen(false);
                if (!user?.id) return;
                const action = values.id ? "updated" : "created";
                const fullName = session?.user?.user_metadata?.["full_name"] ?? "Unknown";
                await supabase.from("activity_log").insert({
                  entity_type: "allocation",
                  entity_id: values.id,
                  action,
                  actor_user_id: user.id,
                  actor_name: fullName,
                  summary: `Allocation ${action}: Tent ${values.room_id}`,
                  details: {
                    bed_a_name: values.bed_a_name,
                    bed_b_name: values.bed_b_name,
                    departure: values.departure_date,
                  },
                });
              },
            },
          );
        }}
      />
    </div>
  );
}

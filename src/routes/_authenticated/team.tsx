import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BedDouble, Edit2, History, MapPin, MoveRight, Plus, Tent, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { RecordDialog, type RecordValues } from "@/components/RecordDialog";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import {
  EMPLOYMENT_STATUS,
  GENDER_OPTIONS,
  isActiveOn,
  today,
  useList,
  useSave,
  useSoftDelete,
} from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import type { AllocationRow, RoomRow, StaffAllocationHistoryRow, TeamMemberRow } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team Members — Ten of Cups Camp Manager" },
      {
        name: "description",
        content: "Staff register with departments, contact details and emergency contacts.",
      },
      { property: "og:title", content: "Team Members — Ten of Cups Camp Manager" },
      {
        property: "og:description",
        content: "Employee directory for camp accommodation allocation.",
      },
    ],
  }),
  component: TeamPage,
});

// ─── helpers ────────────────────────────────────────────────────────────────

function getActiveAllocation(memberId: string, allocations: AllocationRow[], day: string) {
  return allocations.find(
    (a) => (a.bed_a === memberId || a.bed_b === memberId) && isActiveOn(a, day),
  );
}

function bedLabel(memberId: string, alloc: AllocationRow): string {
  return alloc.bed_a === memberId ? "Bed A" : "Bed B";
}

function daysAllocated(arrivalDate: string): number {
  const diff = Date.now() - new Date(arrivalDate).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function employmentLabel(status: string) {
  return EMPLOYMENT_STATUS.find((s) => s.value === status)?.label ?? status;
}

// ─── main page ───────────────────────────────────────────────────────────────

function TeamPage() {
  const { canManage, canOperate, user, session } = useAuth();
  const qc = useQueryClient();
  const day = today();

  // ── data ──
  const { data: members = [], isLoading } = useList<TeamMemberRow>("team_members", "*", "surname");
  const { data: allocations = [] } = useList<AllocationRow>(
    "allocations",
    "*, rooms(room_number, buildings(name, camps(name)))",
    "arrival_date",
  );
  const { data: rooms = [] } = useList<RoomRow>(
    "rooms",
    "*, buildings(name, camps(name))",
    "room_number",
  );
  const { data: allHistory = [] } = useList<StaffAllocationHistoryRow>(
    "staff_allocation_history",
    "*, from_room:from_room_id(room_number, buildings(name, camps(name))), to_room:to_room_id(room_number, buildings(name, camps(name)))",
    "created_at",
  );

  const save = useSave("team_members", "Team member");
  const remove = useSoftDelete("team_members", "Team member");

  // ── ui state ──
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("_all");
  const [campFilter, setCampFilter] = useState("_all");
  const [statusFilter, setStatusFilter] = useState("_all");

  const [selectedMember, setSelectedMember] = useState<TeamMemberRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<RecordValues | undefined>();
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  // ── derived ──
  const departments = useMemo(
    () => [...new Set(members.map((m) => m.department).filter(Boolean) as string[])].sort(),
    [members],
  );
  const camps = useMemo(
    () =>
      [...new Set(rooms.map((r) => r.buildings?.camps?.name).filter(Boolean) as string[])].sort(),
    [rooms],
  );

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (search) {
        const hay =
          `${m.employee_number ?? ""} ${m.name} ${m.surname} ${m.department ?? ""} ${m.position ?? ""}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      if (deptFilter !== "_all" && m.department !== deptFilter) return false;
      const active = getActiveAllocation(m.id, allocations, day);
      if (campFilter !== "_all") {
        if (!active || active.rooms?.buildings?.camps?.name !== campFilter) return false;
      }
      if (statusFilter === "active" && m.employment_status !== "active") return false;
      if (statusFilter === "inactive" && m.employment_status === "active") return false;
      if (statusFilter === "allocated" && !active) return false;
      if (statusFilter === "unallocated" && active) return false;
      return true;
    });
  }, [members, allocations, search, deptFilter, campFilter, statusFilter, day]);

  const roomOptions = rooms.map((r) => ({
    value: r.id,
    label: `${r.room_number} — ${r.buildings?.name ?? ""} (${r.buildings?.camps?.name ?? ""})`,
  }));
  const bedOptions = [
    { value: "a", label: "Bed A" },
    { value: "b", label: "Bed B" },
  ];

  // ── current allocation for selected member ──
  const currentAlloc = selectedMember
    ? getActiveAllocation(selectedMember.id, allocations, day)
    : undefined;

  const memberHistory = useMemo(
    () =>
      selectedMember
        ? [...allHistory]
            .filter((h) => h.team_member_id === selectedMember.id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        : [],
    [allHistory, selectedMember],
  );

  // ── allocate mutation ──
  const allocateMutation = useMutation({
    mutationFn: async (values: RecordValues) => {
      if (!selectedMember) return;
      const hasActive = getActiveAllocation(selectedMember.id, allocations, day);
      if (hasActive)
        throw new Error("Staff member already has an active allocation. Remove it first.");

      const arrDate = values.arrival_date || day;
      const bedKey = values.bed === "a" ? "bed_a" : "bed_b";
      const bedNameKey = values.bed === "a" ? "bed_a_name" : "bed_b_name";
      const payload: Record<string, unknown> = {
        room_id: values.room_id,
        arrival_date: arrDate,
        departure_date: "2099-12-31",
        [bedKey]: selectedMember.id,
        [bedNameKey]: `${selectedMember.name} ${selectedMember.surname}`,
        status: "checked_in",
        department: selectedMember.department,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("allocations").insert(payload);
      if (error) throw new Error(error.message);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: he } = await (supabase as any).from("staff_allocation_history").insert({
        team_member_id: selectedMember.id,
        to_room_id: values.room_id,
        to_bed: values.bed,
        allocation_date: arrDate,
        reason: values.reason || "Allocated",
      });
      if (he) throw new Error(he.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries();
      toast.success("Staff member allocated");
      setAllocateOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── move mutation ──
  const moveMutation = useMutation({
    mutationFn: async (values: RecordValues) => {
      if (!selectedMember || !currentAlloc) return;
      const fromBed = bedLabel(selectedMember.id, currentAlloc);

      // End current allocation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updErr } = await (supabase as any)
        .from("allocations")
        .update({ departure_date: day, status: "checked_out" })
        .eq("id", currentAlloc.id);
      if (updErr) throw new Error(updErr.message);

      // Create new allocation
      const bedKey = values.bed === "a" ? "bed_a" : "bed_b";
      const bedNameKey = values.bed === "a" ? "bed_a_name" : "bed_b_name";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insErr } = await (supabase as any).from("allocations").insert({
        room_id: values.room_id,
        arrival_date: day,
        departure_date: "2099-12-31",
        [bedKey]: selectedMember.id,
        [bedNameKey]: `${selectedMember.name} ${selectedMember.surname}`,
        status: "checked_in",
        department: selectedMember.department,
      });
      if (insErr) throw new Error(insErr.message);

      // Log history
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: he } = await (supabase as any).from("staff_allocation_history").insert({
        team_member_id: selectedMember.id,
        from_room_id: currentAlloc.room_id,
        from_bed: fromBed,
        to_room_id: values.room_id,
        to_bed: values.bed,
        allocation_date: day,
        reason: values.reason || "Moved",
      });
      if (he) throw new Error(he.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries();
      toast.success("Staff member moved");
      setMoveOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── remove allocation mutation ──
  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMember || !currentAlloc) return;
      const fromBed = bedLabel(selectedMember.id, currentAlloc);

      // Clear the bed and check out if both beds empty
      const clearBedA = currentAlloc.bed_a === selectedMember.id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("allocations")
        .update(
          clearBedA
            ? { bed_a: null, bed_a_name: null, departure_date: day, status: "checked_out" }
            : { bed_b: null, bed_b_name: null, departure_date: day, status: "checked_out" },
        )
        .eq("id", currentAlloc.id);
      if (error) throw new Error(error.message);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: he } = await (supabase as any).from("staff_allocation_history").insert({
        team_member_id: selectedMember.id,
        from_room_id: currentAlloc.room_id,
        from_bed: fromBed,
        to_room_id: null,
        to_bed: null,
        allocation_date: day,
        reason: "Allocation removed",
      });
      if (he) throw new Error(he.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries();
      toast.success("Allocation removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── handle delete with validation ──
  function handleDelete(m: TeamMemberRow) {
    const active = getActiveAllocation(m.id, allocations, day);
    if (active) {
      toast.error(
        "Cannot delete a staff member with an active allocation. Remove the allocation first.",
      );
      return;
    }
    remove.mutate(m.id);
  }

  return (
    <div>
      <PageHeader
        title="Team Members"
        subtitle="Staff register — profiles, allocations and history."
        action={
          canManage ? (
            <Button
              onClick={() => {
                setEditing({ is_contractor: "false", accommodation_rate: null });
                setEditOpen(true);
              }}
            >
              <Plus className="size-4" /> New team member
            </Button>
          ) : null
        }
      />

      {/* ── search + filters ── */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          placeholder="Search emp. no., name, dept, position…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="_all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={campFilter} onValueChange={setCampFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Camp" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="_all">All camps</SelectItem>
            {camps.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="_all">All statuses</SelectItem>
            <SelectItem value="active">Active employees</SelectItem>
            <SelectItem value="inactive">Inactive employees</SelectItem>
            <SelectItem value="allocated">Currently allocated</SelectItem>
            <SelectItem value="unallocated">Unallocated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── staff list ── */}
      <DataTable<TeamMemberRow>
        loading={isLoading}
        rows={filtered}
        empty="No team members found."
        columns={[
          { key: "employee_number", label: "Emp. no." },
          {
            key: "name",
            label: "Name",
            render: (r) => (
              <button
                className="font-medium text-primary hover:underline"
                onClick={() => setSelectedMember(r)}
              >
                {r.name} {r.surname}
              </button>
            ),
          },
          { key: "department", label: "Department" },
          { key: "position", label: "Position" },
          {
            key: "employment_status",
            label: "Status",
            render: (r) => (
              <Badge variant={r.employment_status === "active" ? "default" : "secondary"}>
                {employmentLabel(r.employment_status)}
              </Badge>
            ),
          },
          {
            key: "is_contractor",
            label: "Type",
            render: (r) => (r.is_contractor ? <Badge variant="outline">Contractor</Badge> : null),
          },
          {
            key: "allocation",
            label: "Allocated to",
            render: (r) => {
              const a = getActiveAllocation(r.id, allocations, day);
              if (!a) return <span className="text-muted-foreground">—</span>;
              return (
                <span className="text-sm">
                  {a.rooms?.room_number ?? "—"} / {bedLabel(r.id, a)} —{" "}
                  {a.rooms?.buildings?.camps?.name ?? ""}
                </span>
              );
            },
          },
          { key: "phone", label: "Phone" },
        ]}
        onEdit={
          canManage
            ? (r) => {
                setEditing({
                  ...r,
                  is_contractor: r.is_contractor ? "true" : "false",
                } as RecordValues);
                setEditOpen(true);
              }
            : undefined
        }
        onDelete={canManage ? handleDelete : undefined}
        actions={(r) => (
          <Button size="sm" variant="outline" onClick={() => setSelectedMember(r)}>
            Profile
          </Button>
        )}
      />

      {/* ─────────────────────────────────────────────────────────────────────
          Staff profile sheet
         ───────────────────────────────────────────────────────────────────── */}
      <Sheet open={!!selectedMember} onOpenChange={(v) => !v && setSelectedMember(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selectedMember && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="font-display text-2xl">
                  {selectedMember.name} {selectedMember.surname}
                </SheetTitle>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {selectedMember.employee_number && <span>#{selectedMember.employee_number}</span>}
                  {selectedMember.department && <span>· {selectedMember.department}</span>}
                  {selectedMember.position && <span>· {selectedMember.position}</span>}
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant={
                      selectedMember.employment_status === "active" ? "default" : "secondary"
                    }
                  >
                    {employmentLabel(selectedMember.employment_status)}
                  </Badge>
                  {currentAlloc ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Allocated
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Unallocated
                    </Badge>
                  )}
                </div>
              </SheetHeader>

              {/* ── profile summary stats ── */}
              <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border p-4 sm:grid-cols-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> Camp
                  </div>
                  <div className="mt-1 font-semibold text-sm">
                    {currentAlloc?.rooms?.buildings?.camps?.name ?? "—"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Tent className="size-3" /> Tent
                  </div>
                  <div className="mt-1 font-semibold text-sm">
                    {currentAlloc?.rooms?.room_number ?? "—"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <BedDouble className="size-3" /> Bed
                  </div>
                  <div className="mt-1 font-semibold text-sm">
                    {currentAlloc ? bedLabel(selectedMember.id, currentAlloc) : "—"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    Days
                  </div>
                  <div className="mt-1 font-semibold text-sm">
                    {currentAlloc ? daysAllocated(currentAlloc.arrival_date) : "—"}
                  </div>
                </div>
              </div>

              {/* ── quick actions ── */}
              {(canManage || canOperate) && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {!currentAlloc && (
                    <Button size="sm" onClick={() => setAllocateOpen(true)}>
                      <BedDouble className="size-4" /> Allocate
                    </Button>
                  )}
                  {currentAlloc && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setMoveOpen(true)}>
                        <MoveRight className="size-4" /> Move
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeMutation.mutate()}
                        disabled={removeMutation.isPending}
                      >
                        <UserMinus className="size-4" /> Remove Allocation
                      </Button>
                    </>
                  )}
                  {canManage && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing({
                          ...selectedMember,
                          is_contractor: selectedMember.is_contractor ? "true" : "false",
                        } as RecordValues);
                        setEditOpen(true);
                      }}
                    >
                      <Edit2 className="size-4" /> Edit Details
                    </Button>
                  )}
                </div>
              )}

              <Separator className="my-4" />

              {/* ── current allocation ── */}
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Current Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  {currentAlloc ? (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-muted-foreground">Camp</dt>
                        <dd className="font-medium">
                          {currentAlloc.rooms?.buildings?.camps?.name ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Block</dt>
                        <dd className="font-medium">
                          {currentAlloc.rooms?.buildings?.name ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Tent</dt>
                        <dd className="font-medium">{currentAlloc.rooms?.room_number ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Bed</dt>
                        <dd className="font-medium">{bedLabel(selectedMember.id, currentAlloc)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Since</dt>
                        <dd className="font-medium">{currentAlloc.arrival_date}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Length of stay</dt>
                        <dd className="font-medium">
                          {daysAllocated(currentAlloc.arrival_date)} days
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active allocation.</p>
                  )}
                </CardContent>
              </Card>

              {/* ── allocation history ── */}
              <div className="mb-2 flex items-center gap-2">
                <History className="size-4 text-muted-foreground" />
                <h3 className="font-semibold">Allocation History</h3>
              </div>
              {memberHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history recorded yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border text-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">From Tent</th>
                        <th className="px-3 py-2">From Bed</th>
                        <th className="px-3 py-2">To Camp</th>
                        <th className="px-3 py-2">To Tent</th>
                        <th className="px-3 py-2">To Bed</th>
                        <th className="px-3 py-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberHistory.map((h) => (
                        <tr key={h.id} className="border-b last:border-0">
                          <td className="px-3 py-2 whitespace-nowrap">{h.allocation_date}</td>
                          <td className="px-3 py-2">{h.from_room?.room_number ?? "—"}</td>
                          <td className="px-3 py-2">{h.from_bed ?? "—"}</td>
                          <td className="px-3 py-2">{h.to_room?.buildings?.camps?.name ?? "—"}</td>
                          <td className="px-3 py-2">{h.to_room?.room_number ?? "—"}</td>
                          <td className="px-3 py-2">{h.to_bed ?? "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{h.reason ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Separator className="my-4" />

              {/* ── profile fields ── */}
              <h3 className="mb-3 font-semibold">Profile Details</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {[
                  ["Employee Number", selectedMember.employee_number],
                  ["First Name", selectedMember.name],
                  ["Surname", selectedMember.surname],
                  ["Department", selectedMember.department],
                  ["Position", selectedMember.position],
                  ["Gender", selectedMember.gender],
                  ["Phone", selectedMember.phone],
                  ["Emergency Contact", selectedMember.emergency_contact],
                  ["Date Joined", selectedMember.date_joined],
                  ["Email", selectedMember.email],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{(value as string) ?? "—"}</dd>
                  </div>
                ))}
                {selectedMember.notes && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Notes</dt>
                    <dd className="font-medium">{selectedMember.notes}</dd>
                  </div>
                )}
              </dl>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── edit dialog ─── */}
      <RecordDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editing?.id ? "Edit team member" : "New team member"}
        initial={editing}
        submitting={save.isPending}
        fields={[
          { name: "employee_number", label: "Employee number" },
          { name: "name", label: "First name", required: true },
          { name: "surname", label: "Surname", required: true },
          { name: "department", label: "Department" },
          { name: "position", label: "Position" },
          {
            name: "gender",
            label: "Gender",
            type: "select",
            options: GENDER_OPTIONS,
          },
          { name: "phone", label: "Phone number" },
          { name: "email", label: "Email", type: "email" },
          { name: "emergency_contact", label: "Emergency contact" },
          {
            name: "employment_status",
            label: "Employment status",
            type: "select",
            options: EMPLOYMENT_STATUS,
          },
          { name: "date_joined", label: "Date joined", type: "date" },
          { name: "vehicle_registration", label: "Vehicle registration" },
          {
            name: "is_contractor",
            label: "Contractor",
            type: "select",
            options: [
              { value: "false", label: "No" },
              { value: "true", label: "Yes" },
            ],
          },
          {
            name: "accommodation_rate",
            label: "Accommodation rate (per night)",
            type: "number",
            step: "0.01",
            placeholder: "0.00",
          },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSubmit={(values) =>
          save.mutate(
            {
              id: values.id,
              employee_number: values.employee_number,
              name: values.name,
              surname: values.surname,
              department: values.department,
              position: values.position,
              gender: values.gender,
              phone: values.phone,
              email: values.email,
              emergency_contact: values.emergency_contact,
              employment_status: values.employment_status || "active",
              date_joined: values.date_joined,
              vehicle_registration: values.vehicle_registration,
              is_contractor: values.is_contractor === true || values.is_contractor === "true",
              accommodation_rate:
                values.is_contractor === true || values.is_contractor === "true"
                  ? values.accommodation_rate == null || values.accommodation_rate === ""
                    ? null
                    : Number(values.accommodation_rate)
                  : null,
              notes: values.notes,
            },
            {
              onSuccess: async () => {
                setEditOpen(false);
                if (selectedMember && values.id === selectedMember.id) {
                  // refresh selected member data via query invalidation (already done by useSave)
                }
                if (!user?.id) return;
                const wasContractorChanged =
                  (values.is_contractor === true || values.is_contractor === "true") !==
                  selectedMember?.is_contractor;
                const wasRateChanged =
                  values.accommodation_rate !== selectedMember?.accommodation_rate;
                if (wasContractorChanged || wasRateChanged) {
                  const action = values.id ? "updated" : "created";
                  const fullName = session?.user?.user_metadata?.["full_name"] ?? "Unknown";
                  await supabase.from("activity_log").insert({
                    entity_type: "team_member",
                    entity_id: values.id,
                    action,
                    actor_user_id: user.id,
                    actor_name: fullName,
                    summary: `${values.name} ${values.surname}: Contractor status or rate ${action}`,
                    details: {
                      name: `${values.name} ${values.surname}`,
                      is_contractor:
                        values.is_contractor === true || values.is_contractor === "true",
                      accommodation_rate: values.accommodation_rate || null,
                    },
                  });
                }
              },
            },
          )
        }
      />

      {/* ─── allocate dialog ─── */}
      <RecordDialog
        open={allocateOpen}
        onOpenChange={setAllocateOpen}
        title={`Allocate — ${selectedMember?.name ?? ""} ${selectedMember?.surname ?? ""}`}
        description="Select a tent and bed to allocate this staff member."
        initial={{}}
        submitting={allocateMutation.isPending}
        fields={[
          {
            name: "room_id",
            label: "Tent / Room",
            type: "select",
            required: true,
            options: roomOptions,
          },
          { name: "bed", label: "Bed", type: "select", required: true, options: bedOptions },
          { name: "arrival_date", label: "Allocation date", type: "date" },
          { name: "reason", label: "Reason" },
        ]}
        onSubmit={(values) => allocateMutation.mutate(values)}
      />

      {/* ─── move dialog ─── */}
      <RecordDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        title={`Move — ${selectedMember?.name ?? ""} ${selectedMember?.surname ?? ""}`}
        description="Select the new tent and bed. The current allocation will be closed and a new one created."
        initial={{}}
        submitting={moveMutation.isPending}
        fields={[
          {
            name: "room_id",
            label: "New Tent / Room",
            type: "select",
            required: true,
            options: roomOptions,
          },
          { name: "bed", label: "New Bed", type: "select", required: true, options: bedOptions },
          { name: "reason", label: "Reason for move" },
        ]}
        onSubmit={(values) => moveMutation.mutate(values)}
      />
    </div>
  );
}

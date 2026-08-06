import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { RecordDialog, type RecordValues } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { isActiveOn, today, useList, useSave, useSoftDelete } from "@/lib/data";
import type { AllocationRow, TeamMemberRow } from "@/lib/types";

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

function TeamPage() {
  const day = today();
  const { canManage } = useAuth();
  const { data: members = [], isLoading } = useList<TeamMemberRow>("team_members", "*", "surname");
  const { data: allocations = [] } = useList<AllocationRow>(
    "allocations",
    "*, rooms(room_number, buildings(name, camps(name)))",
  );
  const save = useSave("team_members", "Team member");
  const remove = useSoftDelete("team_members", "Team member");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecordValues | undefined>();
  const [search, setSearch] = useState("");

  const currentByMember = useMemo(() => {
    const map = new Map<string, { camp: string; tent: string; bed: string }>();
    const activeAllocations = allocations.filter((row) => isActiveOn(row, day));
    for (const row of activeAllocations) {
      const camp = row.rooms?.buildings?.camps?.name ?? "—";
      const tent = row.rooms?.room_number ?? "—";
      if (row.bed_a && !map.has(row.bed_a)) {
        map.set(row.bed_a, { camp, tent, bed: "Bed A" });
      }
      if (row.bed_b && !map.has(row.bed_b)) {
        map.set(row.bed_b, { camp, tent, bed: "Bed B" });
      }
    }
    return map;
  }, [allocations, day]);

  const rows = useMemo(() => {
    return members.map((member) => {
      const meta = parseStaffMeta(member.notes);
      const assignment = currentByMember.get(member.id);
      return {
        ...member,
        first_name: member.name,
        position: meta.position ?? "—",
        gender: meta.gender ?? "—",
        employment_status: meta.employment_status ?? "—",
        clean_notes: meta.notes ?? "",
        current_camp: assignment?.camp ?? "—",
        current_tent: assignment?.tent ?? "—",
        current_bed: assignment?.bed ?? "—",
      };
    });
  }, [members, currentByMember]);

  const filtered = rows.filter((member) =>
    `${member.employee_number ?? ""} ${member.first_name} ${member.surname} ${member.department ?? ""} ${member.position} ${member.gender} ${member.employment_status}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="People who can be assigned to tents and allocated across the camps."
        action={
          canManage ? (
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> New staff member
            </Button>
          ) : null
        }
      />
      <Input
        className="mb-4 max-w-sm"
        placeholder="Search by employee, name, department, position or status…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <DataTable<
        TeamMemberRow & {
          first_name: string;
          position: string;
          gender: string;
          employment_status: string;
          clean_notes: string;
          current_camp: string;
          current_tent: string;
          current_bed: string;
        }
      >
        loading={isLoading}
        rows={filtered}
        empty="No staff members captured yet."
        columns={[
          { key: "employee_number", label: "Employee Number" },
          { key: "first_name", label: "First Name" },
          { key: "surname", label: "Surname" },
          { key: "department", label: "Department" },
          { key: "position", label: "Position" },
          { key: "gender", label: "Gender" },
          { key: "phone", label: "Phone" },
          { key: "emergency_contact", label: "Emergency Contact" },
          { key: "employment_status", label: "Employment Status" },
          { key: "current_camp", label: "Current Camp" },
          { key: "current_tent", label: "Current Tent" },
          { key: "current_bed", label: "Current Bed" },
          { key: "clean_notes", label: "Notes" },
        ]}
        onEdit={
          canManage
            ? (r) => {
                const meta = parseStaffMeta(r.notes);
                setEditing({
                  ...r,
                  name: r.name,
                  position: meta.position,
                  gender: meta.gender,
                  employment_status: meta.employment_status,
                  notes: meta.notes,
                } as unknown as RecordValues);
                setOpen(true);
              }
            : undefined
        }
        onDelete={canManage ? (r) => remove.mutate(r.id) : undefined}
      />

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? "Edit staff member" : "New staff member"}
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
            options: [
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
              { value: "prefer_not_to_say", label: "Prefer not to say" },
            ],
          },
          { name: "phone", label: "Phone" },
          { name: "emergency_contact", label: "Emergency contact" },
          {
            name: "employment_status",
            label: "Employment status",
            type: "select",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "on_leave", label: "On Leave" },
              { value: "terminated", label: "Terminated" },
            ],
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
              phone: values.phone,
              emergency_contact: values.emergency_contact,
              notes: composeStaffNotes(values.notes, {
                position: values.position,
                gender: values.gender,
                employment_status: values.employment_status,
              }),
            },
            { onSuccess: () => setOpen(false) },
          )
        }
      />
    </div>
  );
}

type StaffMeta = {
  position: string | null;
  gender: string | null;
  employment_status: string | null;
  notes: string;
};

const META_PREFIX = "__staff_meta__:";

function parseStaffMeta(rawNotes: string | null): StaffMeta {
  if (!rawNotes) {
    return { position: null, gender: null, employment_status: null, notes: "" };
  }

  const [firstLine, ...rest] = rawNotes.split("\n");
  if (firstLine.startsWith(META_PREFIX)) {
    const payload = firstLine.slice(META_PREFIX.length);
    try {
      const parsed = JSON.parse(payload) as {
        position?: string | null;
        gender?: string | null;
        employment_status?: string | null;
      };
      return {
        position: parsed.position ?? null,
        gender: parsed.gender ?? null,
        employment_status: parsed.employment_status ?? null,
        notes: rest.join("\n").trim(),
      };
    } catch {
      return { position: null, gender: null, employment_status: null, notes: rawNotes };
    }
  }

  return { position: null, gender: null, employment_status: null, notes: rawNotes };
}

function composeStaffNotes(
  notes: string | null,
  meta: { position?: string | null; gender?: string | null; employment_status?: string | null },
) {
  const normalizedMeta = {
    position: meta.position ?? null,
    gender: meta.gender ?? null,
    employment_status: meta.employment_status ?? null,
  };
  const hasMeta = Object.values(normalizedMeta).some((value) => Boolean(value));
  const cleanNotes = (notes ?? "").trim();

  if (!hasMeta) {
    return cleanNotes || null;
  }

  return `${META_PREFIX}${JSON.stringify(normalizedMeta)}${cleanNotes ? `\n${cleanNotes}` : ""}`;
}

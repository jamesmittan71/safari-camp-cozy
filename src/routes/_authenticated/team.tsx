import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { RecordDialog, type RecordValues } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useList, useSave, useSoftDelete } from "@/lib/data";
import type { TeamMemberRow } from "@/lib/types";

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
  const { canManage } = useAuth();
  const { data: members = [], isLoading } = useList<TeamMemberRow>("team_members", "*", "surname");
  const save = useSave("team_members", "Team member");
  const remove = useSoftDelete("team_members", "Team member");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecordValues | undefined>();
  const [search, setSearch] = useState("");

  const filtered = members.filter((m) =>
    `${m.name} ${m.surname} ${m.department ?? ""} ${m.employee_number ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Team Members"
        subtitle="People who can be allocated to beds across the camps."
        action={
          canManage ? (
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> New team member
            </Button>
          ) : null
        }
      />
      <Input
        className="mb-4 max-w-sm"
        placeholder="Search by name, department or employee number…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <DataTable<TeamMemberRow>
        loading={isLoading}
        rows={filtered}
        empty="No team members captured yet."
        columns={[
          { key: "employee_number", label: "Emp. no." },
          { key: "name", label: "Name", render: (r) => `${r.name} ${r.surname}` },
          { key: "department", label: "Department" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "vehicle_registration", label: "Vehicle" },
          { key: "emergency_contact", label: "Emergency contact" },
          { key: "notes", label: "Notes" },
        ]}
        onEdit={
          canManage
            ? (r) => {
                setEditing({ ...r } as unknown as RecordValues);
                setOpen(true);
              }
            : undefined
        }
        onDelete={canManage ? (r) => remove.mutate(r.id) : undefined}
      />

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? "Edit team member" : "New team member"}
        initial={editing}
        submitting={save.isPending}
        fields={[
          { name: "employee_number", label: "Employee number" },
          { name: "department", label: "Department" },
          { name: "name", label: "Name", required: true },
          { name: "surname", label: "Surname", required: true },
          { name: "phone", label: "Phone" },
          { name: "email", label: "Email", type: "email" },
          { name: "vehicle_registration", label: "Vehicle registration" },
          { name: "emergency_contact", label: "Emergency contact" },
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
              email: values.email,
              vehicle_registration: values.vehicle_registration,
              emergency_contact: values.emergency_contact,
              notes: values.notes,
            },
            { onSuccess: () => setOpen(false) },
          )
        }
      />
    </div>
  );
}

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { HK_STATUS, MAINT_STATUS, PRIORITIES, ROOM_STATUS, useList } from "@/lib/data";
import type { ProfileRow, UserRoleRow } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "User Access — Ten of Cups Camp Manager" },
      {
        name: "description",
        content:
          "Assign administrator, manager, housekeeping and read-only access to staff accounts.",
      },
      { property: "og:title", content: "User Access — Ten of Cups Camp Manager" },
      { property: "og:description", content: "Role-based access control for the camp manager." },
    ],
  }),
  component: UsersPage,
});

const ROLES = ["administrator", "manager", "housekeeping", "read_only"] as const;
const LABEL: Record<string, string> = {
  administrator: "Administrator",
  manager: "Manager",
  housekeeping: "Housekeeping",
  read_only: "Read Only",
};

const SECTIONS = [
  { key: "users", label: "Users" },
  { key: "roles", label: "Roles" },
  { key: "permissions", label: "Permissions" },
  { key: "settings", label: "Settings" },
  { key: "lookup", label: "Lookup Tables" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

type RoleSummaryRow = {
  id: string;
  role: string;
  users: number;
  description: string;
};

type PermissionRow = {
  id: string;
  role: string;
  occupancy: string;
  staff: string;
  housekeeping: string;
  maintenance: string;
  reports: string;
  users: string;
};

function UsersPage() {
  const { role } = useAuth();
  const isAdmin = role === "administrator";
  const [section, setSection] = useState<SectionKey>("users");
  const [query, setQuery] = useState("");
  const qc = useQueryClient();
  const { data: profiles = [], isLoading } = useList<ProfileRow>("profiles", "*", "full_name");
  const { data: roles = [] } = useList<UserRoleRow>("user_roles", "*", "role");

  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;

    return profiles.filter((profile) =>
      `${profile.full_name ?? ""} ${profile.email ?? ""}`.toLowerCase().includes(q),
    );
  }, [profiles, query]);

  const roleSummaries = useMemo<RoleSummaryRow[]>(() => {
    return ROLES.map((item) => ({
      id: item,
      role: LABEL[item],
      users: roles.filter((r) => r.role === item).length,
      description:
        item === "administrator"
          ? "Full access, including access management."
          : item === "manager"
            ? "Can manage camps, allocations, housekeeping and maintenance."
            : item === "housekeeping"
              ? "Focused access to cleaning and operational workflows."
              : "View-only access to operational data and reports.",
    }));
  }, [roles]);

  const permissionMatrix: PermissionRow[] = [
    {
      id: "administrator",
      role: "Administrator",
      occupancy: "manage",
      staff: "manage",
      housekeeping: "manage",
      maintenance: "manage",
      reports: "export",
      users: "manage",
    },
    {
      id: "manager",
      role: "Manager",
      occupancy: "manage",
      staff: "manage",
      housekeeping: "manage",
      maintenance: "manage",
      reports: "export",
      users: "view",
    },
    {
      id: "housekeeping",
      role: "Housekeeping",
      occupancy: "view",
      staff: "view",
      housekeeping: "manage",
      maintenance: "view",
      reports: "view",
      users: "none",
    },
    {
      id: "read_only",
      role: "Read Only",
      occupancy: "view",
      staff: "view",
      housekeeping: "view",
      maintenance: "view",
      reports: "view",
      users: "none",
    },
  ];

  const toggle = useMutation({
    mutationFn: async ({ userId, role, has }: { userId: string; role: string; has: boolean }) => {
      const table = supabase.from("user_roles");
      const { error } = has
        ? await table
            .delete()
            .eq("user_id", userId)
            .eq("role", role as never)
        : await table.insert({ user_id: userId, role: role as never });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Access updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Access & Configuration"
        subtitle={
          isAdmin
            ? "Click a role to grant or revoke it for that account."
            : "Only administrators can change access levels."
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {SECTIONS.map((item) => (
          <Button
            key={item.key}
            size="sm"
            variant={section === item.key ? "default" : "outline"}
            onClick={() => setSection(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {section === "users" && (
        <div className="space-y-4">
          <Input
            className="max-w-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
          />

          <DataTable<ProfileRow>
            loading={isLoading}
            rows={filteredProfiles}
            empty="No user accounts yet."
            columns={[
              { key: "full_name", label: "Name", render: (p) => p.full_name ?? "—" },
              { key: "email", label: "Email" },
              {
                key: "roles",
                label: "Roles",
                render: (p) => {
                  const mine = roles.filter((r) => r.user_id === p.id).map((r) => r.role);
                  return (
                    <div className="flex flex-wrap gap-2">
                      {ROLES.map((item) => {
                        const has = mine.includes(item);
                        return isAdmin ? (
                          <Button
                            key={item}
                            size="sm"
                            variant={has ? "default" : "outline"}
                            onClick={() => toggle.mutate({ userId: p.id, role: item, has })}
                          >
                            {LABEL[item]}
                          </Button>
                        ) : has ? (
                          <Badge key={item}>{LABEL[item]}</Badge>
                        ) : null;
                      })}
                    </div>
                  );
                },
              },
            ]}
          />
        </div>
      )}

      {section === "roles" && (
        <DataTable<RoleSummaryRow>
          rows={roleSummaries}
          empty="No roles defined."
          columns={[
            { key: "role", label: "Role" },
            { key: "users", label: "Users" },
            { key: "description", label: "Description" },
          ]}
        />
      )}

      {section === "permissions" && (
        <DataTable<PermissionRow>
          rows={permissionMatrix}
          empty="No permission data."
          columns={[
            { key: "role", label: "Role" },
            { key: "occupancy", label: "Occupancy" },
            { key: "staff", label: "Staff" },
            { key: "housekeeping", label: "Housekeeping" },
            { key: "maintenance", label: "Maintenance" },
            { key: "reports", label: "Reports" },
            { key: "users", label: "Users" },
          ]}
        />
      )}

      {section === "settings" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SettingCard
            title="Authentication"
            value="Required"
            detail="All routes are protected by login."
          />
          <SettingCard
            title="Role Model"
            value="RBAC"
            detail="Access is granted via user role assignments."
          />
          <SettingCard
            title="Soft Deletes"
            value="Enabled"
            detail="Operational tables retain deleted history."
          />
          <SettingCard
            title="Data Source"
            value="Supabase"
            detail="Primary database and auth provider."
          />
          <SettingCard
            title="User Roles"
            value={String(ROLES.length)}
            detail="Administrator, Manager, Housekeeping, Read Only."
          />
          <SettingCard
            title="Profiles"
            value={String(profiles.length)}
            detail="User profile records loaded from the database."
          />
        </div>
      )}

      {section === "lookup" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <LookupCard
            title="System Roles"
            items={ROLES.map((item) => ({ value: item, label: LABEL[item] }))}
          />
          <LookupCard title="Room Status" items={ROOM_STATUS} />
          <LookupCard title="Housekeeping Status" items={HK_STATUS} />
          <LookupCard title="Maintenance Priority" items={PRIORITIES} />
          <LookupCard title="Maintenance Status" items={MAINT_STATUS} />
        </div>
      )}
    </div>
  );
}

function SettingCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card className="shadow-lodge">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl">{value}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function LookupCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ value: string; label: string }>;
}) {
  return (
    <Card className="shadow-lodge">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={`${title}-${item.value}`} variant="secondary">
            {item.label}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}

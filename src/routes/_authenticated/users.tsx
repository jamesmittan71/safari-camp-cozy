import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useList } from "@/lib/data";
import type { ProfileRow, UserRoleRow } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "User Access — Ten of Cups Camp Manager" },
      { name: "description", content: "Assign administrator, manager, housekeeping and read-only access to staff accounts." },
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

function UsersPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: profiles = [], isLoading } = useList<ProfileRow>("profiles", "*", "full_name");
  const { data: roles = [] } = useList<UserRoleRow>("user_roles", "*", "role");

  const toggle = useMutation({
    mutationFn: async ({ userId, role, has }: { userId: string; role: string; has: boolean }) => {
      const table = supabase.from("user_roles");
      const { error } = has
        ? await table.delete().eq("user_id", userId).eq("role", role as never)
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
        title="User Access"
        subtitle={
          isAdmin
            ? "Click a role to grant or revoke it for that account."
            : "Only administrators can change access levels."
        }
      />
      <DataTable<ProfileRow>
        loading={isLoading}
        rows={profiles}
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
                  {ROLES.map((role) => {
                    const has = mine.includes(role);
                    return isAdmin ? (
                      <Button
                        key={role}
                        size="sm"
                        variant={has ? "default" : "outline"}
                        onClick={() => toggle.mutate({ userId: p.id, role, has })}
                      >
                        {LABEL[role]}
                      </Button>
                    ) : has ? (
                      <Badge key={role}>{LABEL[role]}</Badge>
                    ) : null;
                  })}
                </div>
              );
            },
          },
        ]}
      />
    </div>
  );
}

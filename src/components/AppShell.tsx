import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BedDouble,
  Building2,
  CalendarDays,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Sparkles,
  Tent,
  Users,
  Wrench,
  X,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useList } from "@/lib/data";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/accommodation-board", label: "Accommodation Board", icon: Tent },
  { to: "/camps", label: "Camps", icon: Tent },
  { to: "/buildings", label: "Blocks", icon: Building2 },
  { to: "/rooms", label: "Tents", icon: BedDouble },
  { to: "/allocations", label: "Allocations", icon: ClipboardList },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/housekeeping", label: "Housekeeping", icon: Sparkles },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/team", label: "Staff", icon: Users },
  { to: "/reports", label: "Occupancy Reports", icon: FileBarChart },
  { to: "/users", label: "User Access", icon: Users },
] as const;

const ROLE_LABEL: Record<string, string> = {
  administrator: "Administrator",
  manager: "Manager",
  housekeeping: "Housekeeping",
  read_only: "Read Only",
};

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { fullName, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: camps = [] } = useList<Array<{ id: string; name: string; code: string | null }>>(
    "camps",
    "id, name, code",
  );
  const { data: blocks = [] } = useList<
    Array<{ id: string; name: string; camps?: { name: string } | null }>
  >("buildings", "id, name, camps(name)");
  const { data: tents = [] } = useList<
    Array<{
      id: string;
      room_number: string;
      buildings?: { name: string; camps?: { name: string } | null } | null;
    }>
  >("rooms", "id, room_number, buildings(name, camps(name))");
  const { data: staff = [] } = useList<
    Array<{ id: string; name: string; surname: string; department: string | null }>
  >("team_members", "id, name, surname, department", "surname");

  const query = search.trim().toLowerCase();

  const campMatches = useMemo(
    () =>
      query
        ? camps
            .filter((item) => `${item.name} ${item.code ?? ""}`.toLowerCase().includes(query))
            .slice(0, 4)
        : [],
    [camps, query],
  );

  const blockMatches = useMemo(
    () =>
      query
        ? blocks
            .filter((item) =>
              `${item.name} ${item.camps?.name ?? ""}`.toLowerCase().includes(query),
            )
            .slice(0, 4)
        : [],
    [blocks, query],
  );

  const tentMatches = useMemo(
    () =>
      query
        ? tents
            .filter((item) => {
              const haystack = `${item.room_number} ${item.buildings?.name ?? ""} ${item.buildings?.camps?.name ?? ""}`;
              return haystack.toLowerCase().includes(query);
            })
            .slice(0, 4)
        : [],
    [tents, query],
  );

  const staffMatches = useMemo(
    () =>
      query
        ? staff
            .filter((item) => {
              const haystack = `${item.name} ${item.surname} ${item.department ?? ""}`;
              return haystack.toLowerCase().includes(query);
            })
            .slice(0, 4)
        : [],
    [staff, query],
  );

  const hasMatches =
    campMatches.length || blockMatches.length || tentMatches.length || staffMatches.length;

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
          <img src={logo} alt="Ten of Cups" width={40} height={40} className="size-10" />
          <div className="leading-tight">
            <p className="font-display text-lg text-sidebar-primary">Ten of Cups</p>
            <p className="text-[11px] tracking-[0.18em] uppercase opacity-70">Camp Manager</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-sidebar-foreground lg:hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "hover:bg-sidebar-accent/60",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs opacity-80">
          <p className="truncate font-medium">{fullName ?? "Signed in"}</p>
          <p className="opacity-70">{role ? ROLE_LABEL[role] : ""}</p>
        </div>
      </aside>

      {open ? (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <p className="font-display text-lg">
            {NAV.find((n) => n.to === pathname)?.label ?? "Ten of Cups Camp Manager"}
          </p>
          <div className="order-3 basis-full lg:order-none lg:ml-auto lg:basis-auto">
            <div className="relative w-full lg:w-[28rem]">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search camp, block, tent number, staff name..."
                className="pl-9"
              />

              {query ? (
                <div className="absolute top-full right-0 left-0 z-50 mt-2 max-h-96 overflow-auto rounded-lg border border-border bg-background p-2 shadow-xl">
                  {hasMatches ? (
                    <div className="space-y-2">
                      <SearchSection
                        title="Camp"
                        items={campMatches.map((item) => ({
                          key: item.id,
                          label: item.name,
                          detail: item.code ?? "",
                          to: "/camps",
                        }))}
                        onSelect={() => setSearch("")}
                      />
                      <SearchSection
                        title="Block"
                        items={blockMatches.map((item) => ({
                          key: item.id,
                          label: item.name,
                          detail: item.camps?.name ?? "",
                          to: "/buildings",
                        }))}
                        onSelect={() => setSearch("")}
                      />
                      <SearchSection
                        title="Tent"
                        items={tentMatches.map((item) => ({
                          key: item.id,
                          label: `Tent ${item.room_number}`,
                          detail: `${item.buildings?.name ?? ""}${item.buildings?.camps?.name ? ` · ${item.buildings?.camps?.name}` : ""}`,
                          to: "/rooms",
                        }))}
                        onSelect={() => setSearch("")}
                      />
                      <SearchSection
                        title="Staff"
                        items={staffMatches.map((item) => ({
                          key: item.id,
                          label: `${item.name} ${item.surname}`,
                          detail: item.department ?? "",
                          to: "/team",
                        }))}
                        onSelect={() => setSearch("")}
                      />
                    </div>
                  ) : (
                    <p className="px-2 py-1 text-sm text-muted-foreground">No results found.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function SearchSection({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: Array<{
    key: string;
    label: string;
    detail: string;
    to: "/camps" | "/buildings" | "/rooms" | "/team";
  }>;
  onSelect: () => void;
}) {
  if (!items.length) return null;

  return (
    <div>
      <p className="px-2 py-1 text-[11px] tracking-[0.14em] uppercase text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.key}
            to={item.to}
            onClick={onSelect}
            className="block rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted"
          >
            <p className="font-medium">{item.label}</p>
            {item.detail ? <p className="text-xs text-muted-foreground">{item.detail}</p> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

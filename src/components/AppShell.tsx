import { useState, type ReactNode } from "react";
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
  MapPinned,
  Menu,
  Sparkles,
  Tent,
  Users,
  Wrench,
  X,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/camps", label: "Camps", icon: Tent },
  { to: "/camp-map", label: "Camp Map", icon: MapPinned },
  { to: "/buildings", label: "Buildings", icon: Building2 },
  { to: "/rooms", label: "Rooms", icon: BedDouble },
  { to: "/allocations", label: "Allocations", icon: ClipboardList },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/housekeeping", label: "Housekeeping", icon: Sparkles },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/team", label: "Team Members", icon: Users },
  { to: "/reports", label: "Reports", icon: FileBarChart },
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { fullName, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
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
          <div className="ml-auto flex items-center gap-1">
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

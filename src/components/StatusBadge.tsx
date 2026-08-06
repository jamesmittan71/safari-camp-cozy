import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; className: string }> = {
  available: {
    label: "Available",
    className: "bg-status-available/15 text-status-available border-status-available/30",
  },
  occupied: {
    label: "Occupied",
    className: "bg-status-occupied/15 text-status-occupied border-status-occupied/30",
  },
  cleaning_required: {
    label: "Cleaning Required",
    className: "bg-status-cleaning/15 text-status-cleaning border-status-cleaning/30",
  },
  out_of_service: {
    label: "Out of Service",
    className: "bg-status-maintenance/15 text-status-maintenance border-status-maintenance/30",
  },
  dirty: {
    label: "Dirty",
    className: "bg-status-cleaning/15 text-status-cleaning border-status-cleaning/30",
  },
  vacant: {
    label: "Vacant",
    className: "bg-status-available/15 text-status-available border-status-available/30",
  },
  maintenance: {
    label: "Maintenance",
    className: "bg-status-maintenance/15 text-status-maintenance border-status-maintenance/30",
  },
  operational: {
    label: "Operational",
    className: "bg-status-available/15 text-status-available border-status-available/30",
  },
  checked_in: {
    label: "Checked In",
    className: "bg-status-occupied/15 text-status-occupied border-status-occupied/30",
  },
  to_clean: {
    label: "To Clean",
    className: "bg-status-cleaning/15 text-status-cleaning border-status-cleaning/30",
  },
  dirty: {
    label: "Dirty",
    className: "bg-status-cleaning/15 text-status-cleaning border-status-cleaning/30",
  },
  cleaning_scheduled: {
    label: "Cleaning Scheduled",
    className: "bg-status-occupied/15 text-status-occupied border-status-occupied/30",
  },
  cleaning_in_progress: {
    label: "Cleaning In Progress",
    className: "bg-status-occupied/15 text-status-occupied border-status-occupied/30",
  },
  inspection_required: {
    label: "Inspection Required",
    className: "bg-status-maintenance/15 text-status-maintenance border-status-maintenance/30",
  },
  clean: {
    label: "Clean",
    className: "bg-status-available/15 text-status-available border-status-available/30",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-status-occupied/15 text-status-occupied border-status-occupied/30",
  },
  complete: {
    label: "Complete",
    className: "bg-status-available/15 text-status-available border-status-available/30",
  },
  ready: {
    label: "Ready",
    className: "bg-status-available/15 text-status-available border-status-available/30",
  },
  open: {
    label: "Open",
    className: "bg-status-maintenance/15 text-status-maintenance border-status-maintenance/30",
  },
  completed: {
    label: "Completed",
    className: "bg-status-available/15 text-status-available border-status-available/30",
  },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground border-border" },
  active: {
    label: "Active",
    className: "bg-status-available/15 text-status-available border-status-available/30",
  },
  inactive: { label: "Inactive", className: "bg-muted text-muted-foreground border-border" },
  booked: {
    label: "Booked",
    className: "bg-status-occupied/15 text-status-occupied border-status-occupied/30",
  },
  checked_out: { label: "Checked Out", className: "bg-muted text-muted-foreground border-border" },
  low: { label: "Low", className: "bg-muted text-muted-foreground border-border" },
  medium: {
    label: "Medium",
    className: "bg-status-cleaning/15 text-status-cleaning border-status-cleaning/30",
  },
  high: {
    label: "High",
    className: "bg-status-maintenance/15 text-status-maintenance border-status-maintenance/30",
  },
  critical: {
    label: "Critical",
    className: "bg-destructive/15 text-destructive border-destructive/40",
  },
};

export function StatusBadge({ value, className }: { value?: string | null; className?: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const entry = MAP[value] ?? {
    label: value,
    className: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        entry.className,
        className,
      )}
    >
      {entry.label}
    </span>
  );
}

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
  scheduled: {
    label: "Cleaning Scheduled",
    className: "bg-status-occupied/15 text-status-occupied border-status-occupied/30",
  },
  inspection: {
    label: "Inspection Required",
    className: "bg-status-maintenance/15 text-status-maintenance border-status-maintenance/30",
  },
  clean: {
    label: "Clean",
    className: "bg-status-available/15 text-status-available border-status-available/30",
  },
  normal: {
    label: "Normal",
    className: "bg-muted text-muted-foreground border-border",
  },
  reported: {
    label: "Reported",
    className: "bg-status-cleaning/15 text-status-cleaning border-status-cleaning/30",
  },
  assigned: {
    label: "Assigned",
    className: "bg-status-occupied/15 text-status-occupied border-status-occupied/30",
  },
  waiting_for_parts: {
    label: "Waiting For Parts",
    className: "bg-status-maintenance/15 text-status-maintenance border-status-maintenance/30",
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

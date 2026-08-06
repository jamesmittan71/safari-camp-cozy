import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  empty = "Nothing here yet.",
  onEdit,
  onDelete,
  actions,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean | undefined;
  empty?: string | undefined;
  onEdit?: ((row: T) => void) | undefined;
  onDelete?: ((row: T) => void) | undefined;
  actions?: ((row: T) => ReactNode) | undefined;
}) {
  const hasActions = Boolean(onEdit || onDelete || actions);
  return (
    <div className="surface-lodge overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((c) => (
              <TableHead key={c.key} className={c.className}>
                {c.label}
              </TableHead>
            ))}
            {hasActions ? <TableHead className="w-px text-right">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + 1}
                className="py-10 text-center text-muted-foreground"
              >
                Loading…
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + 1}
                className="py-10 text-center text-muted-foreground"
              >
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.className}>
                    {c.render
                      ? c.render(row)
                      : (((row as Record<string, unknown>)[c.key] as ReactNode) ?? "—")}
                  </TableCell>
                ))}
                {hasActions ? (
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {actions?.(row)}
                      {onEdit ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Edit"
                          onClick={() => onEdit(row)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

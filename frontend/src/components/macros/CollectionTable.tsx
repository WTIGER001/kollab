import { useState } from "react";
import { Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";

export type CollectionColumn = { id: string; label: string };
export type CollectionRow = { id: string; cells: Record<string, string> };

export const CollectionTable = ({
  title,
  columns,
  rows,
  emptyMessage,
  onOpen,
}: {
  title: string;
  columns: CollectionColumn[];
  rows: CollectionRow[];
  emptyMessage: string;
  onOpen?: (id: string) => void;
}) => {
  const [sort, setSort] = useState<{ column: string; direction: "asc" | "desc" }>({ column: columns[0]?.id || "", direction: "asc" });
  const sorted = [...rows].sort((left, right) => {
    const result = (left.cells[sort.column] || "").localeCompare(right.cells[sort.column] || "", undefined, { numeric: true, sensitivity: "base" });
    return sort.direction === "asc" ? result : -result;
  });
  const sortBy = (column: string) => setSort((current) => ({ column, direction: current.column === column && current.direction === "asc" ? "desc" : "asc" }));

  return (
    <Paper variant="outlined" sx={{ borderColor: "var(--border-color)", backgroundColor: "var(--panel-color)", overflow: "hidden" }}>
      <Typography sx={{ px: 2, py: 1.25, borderBottom: "1px solid var(--border-color)", fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>{title}</Typography>
      {sorted.length === 0 ? (
        <Typography sx={{ p: 2, color: "var(--text-secondary)", fontSize: "13px" }}>{emptyMessage}</Typography>
      ) : (
        <Table size="small" aria-label={title}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id} sx={{ borderColor: "var(--border-color)", color: "var(--text-secondary)", fontWeight: 700 }}>
                  <Button onClick={() => sortBy(column.id)} aria-label={`Sort by ${column.label}`} sx={{ color: "inherit", fontWeight: 700, textTransform: "none", minWidth: 0, px: 0 }}>{column.label}</Button>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((row) => (
              <TableRow key={row.id}>
                {columns.map((column, index) => (
                  <TableCell key={column.id} sx={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
                    {index === 0 && onOpen ? (
                      <Button variant="text" onClick={() => onOpen(row.id)} sx={{ textTransform: "none", color: "var(--primary-text-color)", fontWeight: 600 }}>{row.cells[column.id] || "—"}</Button>
                    ) : (row.cells[column.id] || "—")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
};

export const MacroEmpty = ({ message }: { message: string }) => (
  <Typography sx={{ p: 2, color: "var(--text-secondary)", fontSize: "13px", border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-card)", backgroundColor: "var(--panel-color)" }}>{message}</Typography>
);

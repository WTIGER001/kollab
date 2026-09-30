import { useState } from "react";
import { Box, Button, Chip, IconButton, MenuItem, Paper, Select, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { Trash2 } from "lucide-react";
import type { DocumentProperty } from "../../services/api";
import { buildPropertyRollup, formatPropertyDate, normalizePropertyType, sortRollupRows, statusChoices, type PropertyType } from "../pageProperties";

export const PagePropertiesEditor = ({
  properties,
  isEditable,
  onChange,
}: {
  properties: Array<{ key?: string; value?: string; type?: string }>;
  isEditable: boolean;
  onChange: (properties: Array<{ key?: string; value?: string; type?: string }>) => void;
}) => {
  const updateProperty = (index: number, patch: { key?: string; value?: string; type?: PropertyType }) => {
    onChange(properties.map((property, propertyIndex) => {
      if (propertyIndex !== index) return property;
      const next = { ...property, ...patch, type: normalizePropertyType(patch.type ?? property.type) };
      if (patch.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(next.value || "")) next.value = "";
      return next;
    }));
  };
  const renderValue = (property: { value?: string; type?: string }) => {
    const propertyType = normalizePropertyType(property.type);
    if (!property.value) return "—";
    if (propertyType === "status") return <Chip label={property.value} size="small" sx={{ color: "var(--text-primary)", backgroundColor: "color-mix(in srgb, var(--accent-color) 16%, transparent)", border: "1px solid var(--border-color)" }} />;
    if (propertyType === "date") return formatPropertyDate(property.value);
    return property.value;
  };
  return (
    <Paper variant="outlined" sx={{ borderColor: "var(--border-color)", backgroundColor: "var(--panel-color)", overflow: "hidden" }}>
      <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>Page properties</Typography>
        {isEditable && <Button size="small" onClick={() => onChange([...properties, { key: "", value: "", type: "text" }])} sx={{ color: "var(--primary-text-color)", minWidth: 0 }}>Add property</Button>}
      </Box>
      {properties.length === 0 ? (
        <Typography sx={{ p: 2, color: "var(--text-secondary)", fontSize: "13px" }}>No properties have been added.</Typography>
      ) : (
        <Table size="small" aria-label="Page properties">
          <TableBody>
            {properties.map((property, index) => {
              const propertyType = normalizePropertyType(property.type);
              const choices = statusChoices.includes(property.value as typeof statusChoices[number]) || !property.value ? statusChoices : [property.value, ...statusChoices];
              return (
                <TableRow key={index}>
                  <TableCell sx={{ width: "28%", borderColor: "var(--border-color)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {isEditable ? <TextField value={property.key || ""} onChange={(event) => updateProperty(index, { key: event.target.value })} variant="standard" placeholder="Property" fullWidth slotProps={{ htmlInput: { "aria-label": `Property name ${index + 1}` } }} /> : property.key || "Untitled property"}
                  </TableCell>
                  {isEditable && <TableCell sx={{ width: 120, borderColor: "var(--border-color)" }}>
                    <Select value={propertyType} onChange={(event) => updateProperty(index, { type: event.target.value as PropertyType })} variant="standard" aria-label={`Property type ${index + 1}`} fullWidth>
                      <MenuItem value="text">Text</MenuItem>
                      <MenuItem value="status">Status</MenuItem>
                      <MenuItem value="date">Date</MenuItem>
                    </Select>
                  </TableCell>}
                  <TableCell sx={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
                    {isEditable && propertyType === "text" && <TextField value={property.value || ""} onChange={(event) => updateProperty(index, { value: event.target.value })} variant="standard" placeholder="Value" fullWidth slotProps={{ htmlInput: { "aria-label": `Property value ${index + 1}` } }} />}
                    {isEditable && propertyType === "status" && <Select value={property.value || ""} onChange={(event) => updateProperty(index, { value: event.target.value })} variant="standard" displayEmpty aria-label={`Property value ${index + 1}`} fullWidth>
                      <MenuItem value=""><em>Choose a status</em></MenuItem>
                      {choices.map((choice) => <MenuItem key={choice} value={choice}>{choice}</MenuItem>)}
                    </Select>}
                    {isEditable && propertyType === "date" && <TextField value={/^\d{4}-\d{2}-\d{2}$/.test(property.value || "") ? property.value : ""} onChange={(event) => updateProperty(index, { value: event.target.value })} type="date" variant="standard" fullWidth slotProps={{ htmlInput: { "aria-label": `Property value ${index + 1}` } }} />}
                    {!isEditable && renderValue(property)}
                  </TableCell>
                  {isEditable && <TableCell sx={{ width: 40, borderColor: "var(--border-color)" }}><IconButton aria-label={`Remove property ${index + 1}`} size="small" onClick={() => onChange(properties.filter((_, propertyIndex) => propertyIndex !== index))}><Trash2 size={14} /></IconButton></TableCell>}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
};

export const PagePropertiesRollup = ({
  properties,
  keyFilter,
  error,
  onOpenPage,
}: {
  properties: DocumentProperty[];
  keyFilter: string;
  error: string | null;
  onOpenPage: (documentId: string) => void;
}) => {
  const [propertySort, setPropertySort] = useState<{ column: string; direction: "asc" | "desc" }>({ column: "title", direction: "asc" });
  const rollup = buildPropertyRollup(properties, keyFilter);
  const rows = sortRollupRows(rollup.rows, propertySort.column, propertySort.direction);
  const sortBy = (column: string) => setPropertySort((current) => ({ column, direction: current.column === column && current.direction === "asc" ? "desc" : "asc" }));
  return (
    <Paper variant="outlined" sx={{ borderColor: "var(--border-color)", backgroundColor: "var(--panel-color)", overflow: "hidden" }}>
      <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid var(--border-color)" }}><Typography sx={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>Properties rollup{keyFilter ? `: ${keyFilter}` : ""}</Typography></Box>
      {error ? <Typography sx={{ p: 2, color: "var(--text-secondary)", fontSize: "13px" }}>{error}</Typography> : rows.length === 0 ? <Typography sx={{ p: 2, color: "var(--text-secondary)", fontSize: "13px" }}>No matching page properties yet.</Typography> : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" aria-label="Page properties rollup">
            <TableHead>
              <TableRow>
                <TableCell sx={{ borderColor: "var(--border-color)", color: "var(--text-secondary)", fontWeight: 700 }}><Button onClick={() => sortBy("title")} aria-label="Sort by Page" sx={{ color: "inherit", fontWeight: 700, textTransform: "none", minWidth: 0, px: 0 }}>Page</Button></TableCell>
                {rollup.columns.map((column) => (
                  <TableCell key={column} sx={{ borderColor: "var(--border-color)", color: "var(--text-secondary)", fontWeight: 700 }}><Button onClick={() => sortBy(column)} aria-label={`Sort by ${column}`} sx={{ color: "inherit", fontWeight: 700, textTransform: "none", minWidth: 0, px: 0 }}>{column}</Button></TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>{rows.map((row) => (
              <TableRow key={row.documentId}>
                <TableCell sx={{ borderColor: "var(--border-color)" }}><Button variant="text" onClick={() => onOpenPage(row.documentId)} sx={{ textTransform: "none", color: "var(--primary-text-color)", fontWeight: 600 }}>{row.title}</Button></TableCell>
                {rollup.columns.map((column) => {
                  const cell = row.cells[column];
                  const value = cell?.value ?? "";
                  return <TableCell key={column} sx={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}>{!value ? "—" : cell.valueType === "status" ? <Chip label={value} size="small" sx={{ color: "var(--text-primary)", backgroundColor: "color-mix(in srgb, var(--accent-color) 16%, transparent)", border: "1px solid var(--border-color)" }} /> : cell.valueType === "date" ? formatPropertyDate(value) : value}</TableCell>;
                })}
              </TableRow>
            ))}</TableBody>
          </Table>
        </Box>
      )}
    </Paper>
  );
};

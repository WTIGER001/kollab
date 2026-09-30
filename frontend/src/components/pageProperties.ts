export const propertyTypes = ["text", "status", "date"] as const;
export type PropertyType = (typeof propertyTypes)[number];
export const statusChoices = ["Draft", "Active", "Blocked", "Done"] as const;

export interface PropertyCell {
  value: string;
  valueType: PropertyType;
}

export interface RollupRow {
  documentId: string;
  title: string;
  cells: Record<string, PropertyCell>;
}

export interface RollupSource {
  documentId: string;
  title: string;
  key: string;
  value: string;
  valueType: string;
}

export const normalizePropertyType = (value: string | undefined): PropertyType =>
  value === "status" || value === "date" ? value : "text";

const compareText = (left: string, right: string) =>
  left.localeCompare(right, undefined, { sensitivity: "base", numeric: true });

/** One row per page. An empty filter keeps every property key as a column. */
export const buildPropertyRollup = (properties: RollupSource[], keyFilter: string) => {
  const filter = keyFilter.trim();
  const columns: string[] = [];
  const seen = new Set<string>();
  const pages = new Map<string, RollupRow>();

  for (const property of properties) {
    const key = property.key.trim();
    if (!key || (filter && key !== filter)) continue;
    if (!seen.has(key)) {
      seen.add(key);
      columns.push(key);
    }
    const row = pages.get(property.documentId) ?? {
      documentId: property.documentId,
      title: property.title.trim() || "Untitled page",
      cells: {},
    };
    row.cells[key] = { value: property.value, valueType: normalizePropertyType(property.valueType) };
    pages.set(property.documentId, row);
  }

  return {
    columns,
    rows: [...pages.values()].sort((left, right) => compareText(left.title, right.title) || left.documentId.localeCompare(right.documentId)),
  };
};

export const sortRollupRows = (rows: RollupRow[], column: string, direction: "asc" | "desc") => {
  const factor = direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const leftValue = column === "title" ? left.title : left.cells[column]?.value ?? "";
    const rightValue = column === "title" ? right.title : right.cells[column]?.value ?? "";
    const empty = Number(leftValue === "") - Number(rightValue === "");
    if (empty !== 0) return empty;
    return compareText(leftValue, rightValue) * factor || left.documentId.localeCompare(right.documentId);
  });
};

export const formatPropertyDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

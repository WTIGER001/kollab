import { describe, expect, it } from "vitest";
import { buildPropertyRollup, sortRollupRows } from "./pageProperties";

const properties = [
  { documentId: "page-b", title: "Runbook", key: "Status", value: "Active", valueType: "status" },
  { documentId: "page-b", title: "Runbook", key: "Owner", value: "Ada", valueType: "text" },
  { documentId: "page-a", title: "API contract", key: "Owner", value: "Lin", valueType: "text" },
  { documentId: "page-a", title: "API contract", key: "Review", value: "2026-10-01", valueType: "date" },
  { documentId: "page-a", title: "API contract", key: "Note", value: "later", valueType: "person" },
];

describe("page property rollup", () => {
  it("puts each page on one row and keeps every property as a column", () => {
    const rollup = buildPropertyRollup(properties, "");

    expect(rollup.columns).toEqual(["Status", "Owner", "Review", "Note"]);
    expect(rollup.rows.map((row) => row.title)).toEqual(["API contract", "Runbook"]);
    expect(rollup.rows[0].cells.Owner).toEqual({ value: "Lin", valueType: "text" });
    expect(rollup.rows[0].cells.Note.valueType).toBe("text");
    expect(rollup.rows[1].cells.Review).toBeUndefined();
  });

  it("limits the rollup to one named column", () => {
    const rollup = buildPropertyRollup(properties, " Owner ");

    expect(rollup.columns).toEqual(["Owner"]);
    expect(rollup.rows).toHaveLength(2);
    expect(rollup.rows[0].cells.Status).toBeUndefined();
  });

  it("sorts by a property column and keeps empty values last", () => {
    const { rows } = buildPropertyRollup(properties, "");
    const sorted = sortRollupRows(rows, "Status", "asc");

    expect(sorted.map((row) => row.title)).toEqual(["Runbook", "API contract"]);
  });
});

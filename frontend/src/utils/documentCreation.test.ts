import { describe, expect, it } from "vitest";
import { resolveDocumentParent } from "./documentCreation";

describe("resolveDocumentParent", () => {
  it("keeps the root option as a null parent", () => {
    expect(resolveDocumentParent(null, undefined)).toBeNull();
  });

  it("uses an explicitly selected parent page", () => {
    expect(resolveDocumentParent("parent-page", undefined)).toBe("parent-page");
  });

  it("uses the pending sidebar parent when the wizard does not override it", () => {
    expect(resolveDocumentParent(undefined, "sidebar-parent")).toBe("sidebar-parent");
  });
});

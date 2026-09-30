import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PagePropertiesEditor, PagePropertiesRollup } from "./PagePropertiesMacro";

describe("PagePropertiesMacro", () => {
  it("adds a property row", () => {
    const onChange = vi.fn();
    render(<PagePropertiesEditor properties={[]} isEditable onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Add property" }));
    expect(onChange).toHaveBeenCalledWith([{ key: "", value: "", type: "text" }]);
  });

  it("sorts the rollup and opens the selected page", () => {
    const onOpenPage = vi.fn();
    render(
      <PagePropertiesRollup
        properties={[
          { documentId: "page-b", title: "Runbook", projectId: "proj", teamId: "team", key: "Status", value: "Active", valueType: "status", updatedAt: "2026-09-01T00:00:00Z" },
          { documentId: "page-a", title: "API contract", projectId: "proj", teamId: "team", key: "Status", value: "Draft", valueType: "status", updatedAt: "2026-09-01T00:00:00Z" },
        ]}
        keyFilter=""
        error={null}
        onOpenPage={onOpenPage}
      />,
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sort by Page" }));
    fireEvent.click(screen.getByRole("button", { name: "Runbook" }));
    expect(onOpenPage).toHaveBeenCalledWith("page-b");
  });
});

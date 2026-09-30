import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CollectionTable } from "./CollectionTable";

describe("CollectionTable", () => {
  it("says when a source has no rows", () => {
    render(<CollectionTable title="Child pages" columns={[{ id: "title", label: "Page" }]} rows={[]} emptyMessage="No sub-pages found." />);
    expect(screen.getByText("No sub-pages found.")).toBeInTheDocument();
  });

  it("sorts rows and opens the selected one", () => {
    const onOpen = vi.fn();
    render(
      <CollectionTable
        title="Page index"
        columns={[{ id: "title", label: "Page" }]}
        rows={[
          { id: "b", cells: { title: "Runbook" } },
          { id: "a", cells: { title: "API contract" } },
        ]}
        emptyMessage="No pages found in this space."
        onOpen={onOpen}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sort by Page" }));
    fireEvent.click(screen.getByRole("button", { name: "Runbook" }));
    expect(onOpen).toHaveBeenCalledWith("b");
  });
});

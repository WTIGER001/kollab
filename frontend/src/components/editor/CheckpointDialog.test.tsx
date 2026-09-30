import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CheckpointDialog, IdleSessionDialog } from "./CheckpointDialog";

describe("CheckpointDialog", () => {
  it("saves a named checkpoint and explains the audience snapshot", () => {
    const onSave = vi.fn();
    render(
      <CheckpointDialog
        open
        description=""
        saving={false}
        generating={false}
        onDescription={() => {}}
        onClose={() => {}}
        onSkip={() => {}}
        onSave={onSave}
        onGenerate={() => {}}
      />,
    );

    expect(screen.getByText(/approved content review/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save checkpoint" }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
  });

  it("describes an idle checkout as a checkpoint", () => {
    render(<IdleSessionDialog open onClose={() => {}} />);
    expect(screen.getByText(/saved as a checkpoint/i)).toBeInTheDocument();
  });
});

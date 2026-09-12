import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminLocalUsersPage } from "./AdminLocalUsersPage";
import * as api from "../services/api";

vi.mock("../services/api", () => ({
  fetchLocalUsers: vi.fn(),
  createLocalUser: vi.fn(),
  deleteLocalUser: vi.fn(),
  setLocalUserActive: vi.fn(),
  setLocalUserPassword: vi.fn(),
  updateLocalUser: vi.fn(),
}));

const alice = { id: "user-1", username: "alice", displayName: "Alice", email: "alice@example.test", isActive: true };

describe("AdminLocalUsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchLocalUsers).mockResolvedValue([alice]);
  });

  it("edits a local user's profile from its inline administration card", async () => {
    vi.mocked(api.updateLocalUser).mockResolvedValue({ ...alice, displayName: "Alice Admin" });
    render(<AdminLocalUsersPage />);

    await screen.findByText("Alice");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const displayNameInputs = screen.getAllByLabelText("Display name");
    fireEvent.change(displayNameInputs[1], { target: { value: "Alice Admin" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => expect(api.updateLocalUser).toHaveBeenCalledWith("user-1", { displayName: "Alice Admin", email: "alice@example.test" }));
    expect(await screen.findByText("Updated alice.")).toBeInTheDocument();
  });

  it("requires a second action before permanently removing a local user", async () => {
    vi.mocked(api.deleteLocalUser).mockResolvedValue();
    render(<AdminLocalUsersPage />);

    await screen.findByText("Alice");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("button", { name: "Remove permanently" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove permanently" }));

    await waitFor(() => expect(api.deleteLocalUser).toHaveBeenCalledWith("user-1"));
    expect(await screen.findByText("Removed alice.")).toBeInTheDocument();
  });
});

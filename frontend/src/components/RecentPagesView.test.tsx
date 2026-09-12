import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecentPagesView } from "./RecentPagesView";
import { fetchRecentDocuments } from "../services/api";

vi.mock("../services/api", () => ({
  fetchRecentDocuments: vi.fn(),
}));

const mockFetchRecentDocuments = vi.mocked(fetchRecentDocuments);

const baseProps = {
  onNavigate: vi.fn(),
  teams: [],
  projects: [],
  onCreateSpace: vi.fn(),
  onOpenPersonalSpace: vi.fn(),
  onOpenSharedSpace: vi.fn(),
};

describe("RecentPagesView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guides an account with no recent pages to create its first team space", async () => {
    mockFetchRecentDocuments.mockResolvedValue([]);

    render(<RecentPagesView {...baseProps} />);

    expect(await screen.findByText("How would you like to start?")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Filter by title or space...")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create team space" }));
    expect(baseProps.onCreateSpace).toHaveBeenCalledOnce();
  });

  it("returns to the normal recent-pages view when activity exists", async () => {
    mockFetchRecentDocuments.mockResolvedValue([
      {
        id: "doc-1", slug: "doc-1", content: "", parentId: null, createdBy: "", updatedBy: "",
        title: "Project brief",
        teamId: "team-1",
        projectId: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      },
    ]);

    render(<RecentPagesView {...baseProps} teams={[{ id: "team-1", name: "Engineering", abbreviation: "eng", description: "" }]} />);

    await waitFor(() => expect(screen.getByText("Project brief")).toBeInTheDocument());
    expect(screen.getByText("Recent Pages")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Filter by title or space...")).toBeInTheDocument();
  });
});

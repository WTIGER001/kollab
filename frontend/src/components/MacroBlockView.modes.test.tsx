import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentContext } from "./DocumentContext";
import { MacroBlockView } from "./MacroBlockView";
import { fetchDocumentProperties } from "../services/api";

const { isEditable } = vi.hoisted(() => ({ isEditable: vi.fn() }));

vi.mock("@tiptap/react", () => ({
  NodeViewWrapper: ({ children, className }: { children: React.ReactNode; className?: string }) => <div data-testid="node-view-wrapper" className={className}>{children}</div>,
}));
vi.mock("../hooks/useIsEditable", () => ({ useIsEditable: isEditable }));
vi.mock("../auth/SessionContext", () => ({ useSession: () => ({ user: { id: "reader-1" } }) }));
vi.mock("react-oidc-context", () => ({ useAuth: () => ({ isAuthenticated: true, user: { profile: { preferred_username: "reader" } } }) }));
vi.mock("../services/api", () => ({
  API_BASE_URL: "http://kollab.test",
  authenticatedMediaUrl: (src: string) => src,
  getApiToken: () => null,
  fetchAttachments: vi.fn().mockResolvedValue([]),
  generateAIContent: vi.fn(),
  fetchTags: vi.fn().mockResolvedValue([]),
  fetchAllDocumentTags: vi.fn().mockResolvedValue({}),
  fetchTeamUsers: vi.fn().mockResolvedValue([]),
  fetchTeams: vi.fn().mockResolvedValue([]),
  fetchUserMentions: vi.fn().mockResolvedValue([]),
  fetchDocument: vi.fn().mockResolvedValue({ id: "source", title: "Source", content: "" }),
  fetchReviewedDocument: vi.fn().mockResolvedValue(null),
  fetchDocumentProperties: vi.fn().mockResolvedValue([]),
  fetchDocumentReview: vi.fn().mockResolvedValue({ status: "draft", nextReviewAt: null }),
  updateDocumentReview: vi.fn(),
}));
vi.mock("./DocumentPreviewer", () => ({ DocumentPreviewer: () => <div>Document preview</div> }));
vi.mock("@excalidraw/excalidraw", () => ({ Excalidraw: () => <div>Excalidraw canvas</div>, exportToSvg: vi.fn() }));
vi.mock("mermaid", () => ({ default: { initialize: vi.fn(), render: vi.fn().mockResolvedValue({ svg: "<svg />" }) } }));
vi.mock("recharts", () => {
  const Container = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return { ResponsiveContainer: Container, BarChart: Container, LineChart: Container, PieChart: Container, Bar: Container, Line: Container, Pie: Container, XAxis: Container, YAxis: Container, CartesianGrid: Container, Tooltip: Container, Legend: Container, Cell: Container };
});
vi.mock("react-big-calendar", () => ({ Calendar: () => <div>Calendar</div>, dateFnsLocalizer: vi.fn(() => ({})) }));

const macroTypes = [
  "status-badge", "mentions-list", "chart-analytics", "ai-content", "children-display", "page-index",
  "excerpt-include", "attachments-list", "single-attachment", "markdown-paste", "drawio", "excalidraw",
  "mermaid", "hero", "page-properties", "page-properties-report", "content-review", "roadmap-planner",
  "team-calendars", "popular-labels", "jira-gitlab-issue", "gitlab-issue-list",
];

const contextValue = {
  activeDocId: "document-1",
  selectedTeamId: "team-1",
  selectedProjectId: "project-1",
  documents: [{ id: "document-1", title: "Current document", content: "", children: [] }],
  onSelectDoc: vi.fn(),
  isSharedMode: false,
};

const configs: Record<string, Record<string, unknown>> = {
  "status-badge": { status: "In Progress" },
  "chart-analytics": { data: '[{"name":"Jan","value":1}]' },
  "ai-content": { generatedText: "Generated summary" },
  "markdown-paste": { markdown: "# A heading", isBlockMode: true },
  "page-properties": { properties: [{ key: "Owner", value: "Reader", type: "text" }] },
  "roadmap-planner": { epics: '[{"id":"1","title":"Phase","start":0,"duration":1}]' },
  "team-calendars": { events: "[]" },
};

const editor = { isDestroyed: false, chain: vi.fn().mockReturnThis(), focus: vi.fn().mockReturnThis(), insertContentAt: vi.fn().mockReturnThis(), insertContent: vi.fn().mockReturnThis(), run: vi.fn() } as any;

const renderMacro = (type: string, editable: boolean, config = configs[type] || {}) => {
  isEditable.mockReturnValue(editable);
  return render(
    <DocumentContext.Provider value={contextValue as any}>
      <MacroBlockView
        node={{ attrs: { type, config } } as any}
        editor={editor}
        getPos={vi.fn(() => 1)}
        updateAttributes={vi.fn()}
        deleteNode={vi.fn()}
        decorations={[]}
        selected={false}
        view={{} as any}
        innerDecorations={{} as any}
        HTMLAttributes={{}}
        extension={{} as any}
      />
    </DocumentContext.Provider>,
  );
};

describe("MacroBlockView mode rendering", () => {
  afterEach(() => vi.clearAllMocks());

  it.each(macroTypes)("renders %s as a reader-facing viewport in read mode", (type) => {
    const { unmount } = renderMacro(type, false);
    expect(screen.getByTestId("node-view-wrapper")).toHaveClass("macro-block-wrapper-readonly");
    expect(screen.queryByText(/UI Macro:/)).not.toBeInTheDocument();
    unmount();
  });

  it.each(macroTypes)("renders %s with editing chrome in edit mode", (type) => {
    const { unmount } = renderMacro(type, true);
    expect(screen.getByTestId("node-view-wrapper")).toHaveClass("macro-block-wrapper");
    expect(screen.getByText(/UI Macro:/)).toBeInTheDocument();
    unmount();
  });

  it("keeps issue configuration and mutation actions out of read mode", () => {
    const issue = renderMacro("jira-gitlab-issue", false);
    expect(screen.getByText("No issue has been configured for this card.")).toBeInTheDocument();
    expect(screen.queryByText("Fetch Issue Details")).not.toBeInTheDocument();
    issue.unmount();

    const list = renderMacro("gitlab-issue-list", false);
    expect(screen.getByText("No GitLab issue list has been configured.")).toBeInTheDocument();
    expect(screen.queryByText("Fetch Issues")).not.toBeInTheDocument();
    list.unmount();
  });

  it("pivots page properties into one row per page", async () => {
    vi.mocked(fetchDocumentProperties).mockResolvedValue([
      { documentId: "page-b", title: "Runbook", projectId: "project-1", teamId: "team-1", key: "Status", value: "Active", valueType: "status", updatedAt: "2026-09-29T00:00:00Z" },
      { documentId: "page-b", title: "Runbook", projectId: "project-1", teamId: "team-1", key: "Owner", value: "Ada", valueType: "text", updatedAt: "2026-09-29T00:00:00Z" },
      { documentId: "page-a", title: "API contract", projectId: "project-1", teamId: "team-1", key: "Owner", value: "Lin", valueType: "text", updatedAt: "2026-09-29T00:00:00Z" },
    ]);
    const { unmount } = renderMacro("page-properties-report", false, { key: "" });

    expect(await screen.findByRole("columnheader", { name: "Owner" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "API contract" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Runbook" })).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    unmount();
  });

  it("offers a status value for a typed page property", () => {
    const { unmount } = renderMacro("page-properties", true, { properties: [{ key: "Status", value: "Active", type: "status" }] });

    expect(screen.getByLabelText("Property type 1")).toHaveTextContent("Status");
    expect(screen.getByLabelText("Property value 1")).toHaveTextContent("Active");
    unmount();
  });

  it("keeps configured GitLab issue lists readable while hiding edit actions", () => {
    const { unmount } = renderMacro("gitlab-issue-list", false, {
      integrationId: "connection-1",
      issues: [{ key: "KOL-42", title: "Visible issue", status: "Open", assignee: "Reader", priority: "High", url: "https://gitlab.example/issues/42" }],
    });
    expect(screen.getByText("Visible issue")).toBeInTheDocument();
    expect(screen.getByText("KOL-42")).toBeInTheDocument();
    expect(screen.queryByText("Refresh")).not.toBeInTheDocument();
    unmount();
  });
});

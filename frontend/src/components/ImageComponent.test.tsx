import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageComponent } from "./ImageComponent";

vi.mock("@tiptap/react", () => ({
  NodeViewWrapper: ({ children }: { children: React.ReactNode }) => <div data-testid="node-view-wrapper">{children}</div>,
}));

vi.mock("../services/api", () => ({
  API_BASE_URL: "http://kollab.test",
  authenticatedMediaUrl: (src: string) => src,
}));

const imageNode = {
  attrs: {
    imageId: "image-1",
    src: "http://kollab.test/api/images/image-1/2",
    alt: "Floor plan",
    size: "2",
    alignment: "center",
  },
};

const createEditor = (isEditable: boolean) => ({
  isEditable,
  isDestroyed: false,
  on: vi.fn(),
  off: vi.fn(),
  commands: { setNodeSelection: vi.fn() },
});

describe("ImageComponent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLElement.prototype.setPointerCapture = vi.fn();
  });

  it("opens a zoomable, pannable preview without mounting edit controls in read mode", () => {
    const editor = createEditor(false);
    render(
      <ImageComponent
        editor={editor}
        node={imageNode}
        getPos={vi.fn()}
        updateAttributes={vi.fn()}
        deleteNode={vi.fn()}
        selected
      />,
    );

    expect(screen.queryByText("SM")).not.toBeInTheDocument();
    fireEvent.click(screen.getByAltText("Floor plan"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByLabelText("Reset zoom")).toHaveTextContent("125%");

    const lightboxImage = screen.getAllByAltText("Floor plan")[1];
    const viewport = lightboxImage.parentElement!;
    fireEvent.pointerDown(viewport, { pointerId: 1, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 45, clientY: 35 });
    expect(lightboxImage).toHaveStyle({ transform: "translate(25px, 15px) scale(1.25)" });
  });

  it("shows image edit controls only while the editor is editable", () => {
    render(
      <ImageComponent
        editor={createEditor(true)}
        node={imageNode}
        getPos={vi.fn()}
        updateAttributes={vi.fn()}
        deleteNode={vi.fn()}
        selected
      />,
    );

    expect(screen.getByText("SM")).toBeInTheDocument();
    fireEvent.click(screen.getByAltText("Floor plan"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

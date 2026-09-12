import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MacroBlockView } from './MacroBlockView';
import { DocumentContext } from './DocumentContext';

// Mock Tiptap's NodeViewWrapper to just render children
vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children }: any) => <div data-testid="node-view-wrapper">{children}</div>,
}));

// Mock hooks and services
vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: () => <div data-testid="excalidraw-mock">Excalidraw Mock</div>,
  exportToSvg: vi.fn(),
}));

vi.mock('../hooks/useIsEditable', () => ({
  useIsEditable: vi.fn().mockReturnValue(true),
}));

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn().mockReturnValue({ isAuthenticated: true, user: { profile: { preferred_username: 'testuser' } } }),
}));

vi.mock('../services/api', () => ({
  fetchAttachments: vi.fn().mockResolvedValue([]),
  generateAIContent: vi.fn(),
  fetchTags: vi.fn().mockResolvedValue([]),
  fetchAllDocumentTags: vi.fn().mockResolvedValue({}),
  fetchTeamUsers: vi.fn().mockResolvedValue([]),
  fetchTeams: vi.fn().mockResolvedValue([]),
  fetchUserMentions: vi.fn().mockResolvedValue([]),
	fetchDocument: vi.fn().mockResolvedValue({ id: 'source-page', title: 'Source page', content: JSON.stringify({ type: 'doc', content: [{ type: 'excerpt', attrs: { excerptId: 'excerpt-1' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Live policy text' }] }] }] }) }),
}));

describe('MacroBlockView', () => {
  const mockUpdateAttributes = vi.fn();
  const mockDeleteNode = vi.fn();
  const mockGetPos = vi.fn().mockReturnValue(0);
  const mockEditor = {
    chain: vi.fn().mockReturnThis(),
    focus: vi.fn().mockReturnThis(),
    insertContentAt: vi.fn().mockReturnThis(),
    run: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderMacro = (type: string, config: any = {}) => {
    return render(
      <DocumentContext.Provider value={{ activeDocId: 'doc-1', selectedTeamId: 'team-1', isSharedMode: false } as any}>
        <MacroBlockView 
          node={{ attrs: { type, config } } as any}
          updateAttributes={mockUpdateAttributes}
          deleteNode={mockDeleteNode}
          editor={mockEditor}
          getPos={mockGetPos}
          selected={false}
          decorations={[]} view={mockEditor.view} innerDecorations={{} as any} HTMLAttributes={{}}
          extension={{} as any}
        />
      </DocumentContext.Provider>
    );
  };

  it('renders a hero macro with title and subtitle', () => {
    renderMacro('hero', { 
      title: 'Welcome to the Project',
      subtitle: 'This is the main dashboard',
      layoutVariant: 'banner'
    });
    
    expect(screen.getByText('Welcome to the Project')).toBeInTheDocument();
    expect(screen.getByText('This is the main dashboard')).toBeInTheDocument();
  });

  it('renders a markdown-paste macro with textarea when editable', () => {
    renderMacro('markdown-paste', { markdown: '' });
    
    expect(screen.getByPlaceholderText(/# Heading 1/)).toBeInTheDocument();
    expect(screen.getByText('Upload .md File')).toBeInTheDocument();
  });

	it('resolves an excerpt include from its protected source document', async () => {
		renderMacro('excerpt-include', { pageId: 'source-page', excerptId: 'excerpt-1' });
		expect(await screen.findByText('Live policy text')).toBeInTheDocument();
		expect(screen.getByText('Excerpt from Source page')).toBeInTheDocument();
	});
});

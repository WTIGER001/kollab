import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Box, IconButton, Select, MenuItem } from '@mui/material';
import { Plus, Trash2, Square } from 'lucide-react';

export const CardsGridNodeView = (props: any) => {
  const { node, updateAttributes, editor, getPos, deleteNode } = props;
  
  const [isEditable, setIsEditable] = React.useState(editor.isEditable);

  React.useEffect(() => {
    setIsEditable(editor.isEditable);
    const updateEditable = () => setIsEditable(editor.isEditable);
    editor.on('transaction', updateEditable);
    return () => {
      editor.off('transaction', updateEditable);
    };
  }, [editor]);

  // Normalize: ensure every cardItem has a unique cardId
  React.useEffect(() => {
    let needsUpdate = false;
    const tr = editor.state.tr;
    let childPos = typeof getPos === 'function' ? getPos() + 1 : 0;
    
    if (childPos > 0) {
      node.forEach((child: any) => {
        if (!child.attrs.cardId) {
          needsUpdate = true;
          tr.setNodeMarkup(childPos, undefined, {
            ...child.attrs,
            cardId: Math.random().toString(36).substr(2, 9)
          });
        }
        childPos += child.nodeSize;
      });

      if (needsUpdate) {
        tr.setMeta('addToHistory', false);
        tr.setMeta('isNormalization', true);
        editor.view.dispatch(tr);
      }
    }
  }, [node, getPos, editor]);

  const addCard = () => {
    if (typeof getPos === 'function') {
      const pos = getPos() + node.nodeSize - 1; 
      editor.chain().focus().insertContentAt(pos, {
        type: 'cardItem',
        attrs: { cardId: Math.random().toString(36).substr(2, 9) },
        content: [{ type: 'paragraph' }]
      }).run();
    }
  };

  const handleSizeChange = (event: any) => {
    updateAttributes({ cardSize: event.target.value });
  };

  const toggleBorder = () => {
    updateAttributes({ showBorder: !node.attrs.showBorder });
  };

  const domId = React.useMemo(() => `cards-${Math.random().toString(36).substr(2, 9)}`, []);

  const cardSize = node.attrs.cardSize || "md";
  const showBorder = node.attrs.showBorder || false;
  const displayBorder = isEditable || showBorder;

  return (
    <NodeViewWrapper className="cards-grid-macro-wrapper" style={{ width: '100%', display: 'block' }}>
      <Box id={domId} sx={{ width: "100%", border: displayBorder ? "1px solid var(--border-color)" : "none", borderRadius: 2, overflow: "hidden", my: 2 }}>
        
        {isEditable && (
          <Box sx={{ borderBottom: displayBorder ? 1 : 0, borderColor: "divider", bgcolor: "rgba(0,0,0,0.2)", display: "flex", alignItems: "center", p: 1, gap: 1 }}>
            <Select
              value={cardSize}
              onChange={handleSizeChange}
              size="small"
              sx={{ 
                height: 32, 
                bgcolor: 'var(--bg-primary)',
                '& .MuiSelect-select': { py: 0.5 }
              }}
            >
              <MenuItem value="sm">Small Cards</MenuItem>
              <MenuItem value="md">Medium Cards</MenuItem>
              <MenuItem value="lg">Large Cards</MenuItem>
            </Select>
            <IconButton size="small" onClick={addCard} title="Add Card">
              <Plus size={18} />
            </IconButton>
            <IconButton size="small" onClick={toggleBorder} title={showBorder ? "Hide Border in Read Mode" : "Show Border in Read Mode"} color={showBorder ? "primary" : "default"}>
              <Square size={18} />
            </IconButton>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton size="small" onClick={() => deleteNode()} color="error" title="Delete entire grid">
              <Trash2 size={16} />
            </IconButton>
          </Box>
        )}

        <Box sx={{ px: displayBorder ? 2 : 0, py: 2, bgcolor: displayBorder ? "var(--bg-secondary)" : "transparent" }}>
          <div className={`cards-grid-container size-${cardSize}`}>
            <NodeViewContent />
          </div>
        </Box>
      </Box>
    </NodeViewWrapper>
  );
};

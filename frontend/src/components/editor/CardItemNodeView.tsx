import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Box, IconButton } from '@mui/material';
import { Trash2 } from 'lucide-react';

export const CardItemNodeView = (props: any) => {
  const { editor, deleteNode } = props;
  const isEditable = editor.isEditable;

  return (
    <NodeViewWrapper className="card-item-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
      <Box 
        sx={{ 
          position: 'relative',
          border: "1px solid var(--border-color)", 
          borderRadius: 2, 
          bgcolor: "var(--bg-primary)",
          p: 2,
          flexGrow: 1,
          transition: "box-shadow 0.2s",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            "& .card-delete-btn": {
              opacity: 1
            }
          }
        }}
      >
        {isEditable && (
          <IconButton 
            className="card-delete-btn"
            size="small" 
            onClick={deleteNode} 
            color="error" 
            title="Delete card"
            sx={{ 
              position: 'absolute', 
              top: 8, 
              right: 8, 
              opacity: 0,
              transition: 'opacity 0.2s',
              bgcolor: 'var(--bg-secondary)',
              '&:hover': { bgcolor: 'var(--bg-secondary)', filter: 'brightness(0.9)' }
            }}
          >
            <Trash2 size={14} />
          </IconButton>
        )}
        <NodeViewContent />
      </Box>
    </NodeViewWrapper>
  );
};

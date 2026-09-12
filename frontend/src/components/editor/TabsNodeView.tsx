import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { Box, Tabs, Tab, IconButton } from "@mui/material";
import { Plus, Trash2, Square } from "lucide-react";
import React from "react";

export const TabsNodeView = (props: any) => {
  const { node, updateAttributes, getPos, editor } = props;
  const [activeTab, setActiveTab] = React.useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const addTab = () => {
    if (typeof getPos === "function") {
      const pos = getPos() + node.nodeSize - 1; // position at end of TabsContainer
      editor.chain().focus().insertContentAt(pos, {
        type: 'tabItem',
        attrs: { 
          label: `Tab ${node.childCount + 1}`,
          tabId: Math.random().toString(36).substr(2, 9)
        },
        content: [{ type: 'paragraph' }]
      }).run();
    }
  };

  const removeTab = (index: number) => {
    if (node.childCount <= 1) return;
    
    let childPos = getPos() + 1;
    for (let i = 0; i < index; i++) {
      childPos += node.child(i).nodeSize;
    }
    const childNode = node.child(index);
    
    editor.chain().deleteRange({ from: childPos, to: childPos + childNode.nodeSize }).run();
    
    if (activeTab === index) {
      setActiveTab(Math.max(0, index - 1));
    } else if (activeTab > index) {
      setActiveTab(activeTab - 1);
    }
  };

  const updateTabLabel = (index: number, newLabel: string) => {
    let childPos = getPos() + 1;
    for (let i = 0; i < index; i++) {
      childPos += node.child(i).nodeSize;
    }
    editor.view.dispatch(
      editor.view.state.tr.setNodeMarkup(childPos, undefined, {
        ...node.child(index).attrs,
        label: newLabel
      })
    );
  };

  const [isEditable, setIsEditable] = React.useState(editor.isEditable);

  React.useEffect(() => {
    setIsEditable(editor.isEditable);
    const updateEditable = () => setIsEditable(editor.isEditable);
    editor.on('transaction', updateEditable);
    return () => {
      editor.off('transaction', updateEditable);
    };
  }, [editor]);

  // Normalize: ensure every tabItem has a unique tabId
  React.useEffect(() => {
    let needsUpdate = false;
    const tr = editor.state.tr;
    let childPos = typeof getPos === 'function' ? getPos() + 1 : 0;
    
    if (childPos > 0) {
      node.forEach((child: any) => {
        if (!child.attrs.tabId) {
          needsUpdate = true;
          tr.setNodeMarkup(childPos, undefined, {
            ...child.attrs,
            tabId: Math.random().toString(36).substr(2, 9)
          });
        }
        childPos += child.nodeSize;
      });

      if (needsUpdate) {
        tr.setMeta('addToHistory', false);
        // Avoid triggering immediate autosave spam for normalization
        tr.setMeta('isNormalization', true);
        editor.view.dispatch(tr);
      }
    }
  }, [node, getPos, editor]);

  const domId = React.useMemo(() => `tabs-${Math.random().toString(36).substr(2, 9)}`, []);

  // Get the active tab's ID for CSS targeting
  const activeTabNode = node.childCount > activeTab ? node.child(activeTab) : null;
  const activeTabId = activeTabNode?.attrs?.tabId;

  const showBorder = node.attrs.showBorder || false;
  const displayBorder = isEditable || showBorder;

  const toggleBorder = () => {
    updateAttributes({ showBorder: !showBorder });
  };

  // Convert node.content (Fragment) to an array for map
  const tabsArray: any[] = [];
  node.content.forEach((child: any) => {
    tabsArray.push(child);
  });

  return (
    <NodeViewWrapper className="tabs-macro-wrapper">
      <Box sx={{ border: displayBorder ? "1px solid var(--border-color)" : "none", borderRadius: 2, overflow: "hidden", my: 2 }}>
        <Box sx={{ borderBottom: displayBorder ? 1 : 0, borderColor: "divider", bgcolor: displayBorder ? "rgba(0,0,0,0.2)" : "transparent", display: "flex", alignItems: "center" }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
            {tabsArray.map((child: any, index: number) => (
              <Tab 
                key={index}
                value={index}
                component="div"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <input 
                      value={child.attrs.label}
                      onChange={(e) => updateTabLabel(index, e.target.value)}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'inherit', 
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        fontWeight: 'inherit',
                        width: Math.max(30, child.attrs.label.length * 8) + 'px',
                        outline: 'none',
                        pointerEvents: isEditable ? 'auto' : 'none'
                      }}
                      readOnly={!isEditable}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab(index);
                      }}
                    />
                    {isEditable && node.childCount > 1 && (
                      <Trash2 
                        size={14} 
                        style={{ cursor: "pointer", opacity: 0.5 }} 
                        onClick={(e) => { e.stopPropagation(); removeTab(index); }}
                      />
                    )}
                  </Box>
                } 
              />
            ))}
          </Tabs>
          {isEditable && (
            <>
              <IconButton size="small" onClick={addTab} sx={{ ml: 1 }} title="Add Tab">
                <Plus size={18} />
              </IconButton>
              <IconButton size="small" onClick={toggleBorder} title={showBorder ? "Hide Border in Read Mode" : "Show Border in Read Mode"} color={showBorder ? "primary" : "default"}>
                <Square size={18} />
              </IconButton>
            </>
          )}
          <Box sx={{ flexGrow: 1 }} />
          {isEditable && (
            <IconButton size="small" onClick={() => props.deleteNode()} sx={{ mr: 1 }} color="error" title="Delete entire macro">
              <Trash2 size={16} />
            </IconButton>
          )}
        </Box>
        
        <Box sx={{ p: displayBorder ? 2 : 0, py: 2 }}>
          {/* We use robust CSS attribute selectors to show only the active tab item */}
          <div id={domId} className="tabs-content-container" style={{ position: 'relative' }}>
            <style>{`
              #${domId} [data-type="tab-item"] {
                position: absolute !important;
                opacity: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
                pointer-events: none !important;
                z-index: -1 !important;
              }
              #${domId} [data-type="tab-item"][data-tab-id="${activeTabId}"] {
                position: relative !important;
                opacity: 1 !important;
                height: auto !important;
                overflow: visible !important;
                pointer-events: auto !important;
                z-index: 1 !important;
              }
            `}</style>
            <NodeViewContent />
          </div>
        </Box>
      </Box>
    </NodeViewWrapper>
  );
};

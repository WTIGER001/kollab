import React from "react";
import { TableBubbleToolbar } from "../TableBubbleToolbar";
import { TableCreatorDialog } from "../TableCreatorDialog";
import { AIPromptBar } from "../AIPromptBar";
import { LinkBubbleMenu } from "./LinkBubbleMenu";
import { SelectionBubbleMenu } from "./SelectionBubbleMenu";
import { useIsEditable } from "../../hooks/useIsEditable";

export interface EditorFloatingMenusProps {
  editor: any;
  tableCreatorOpen: boolean;
  setTableCreatorOpen: (val: boolean) => void;
  insertTable: (rows: number, cols: number, withHeader: boolean) => void;
  aiPromptOpen: boolean;
  setAiPromptOpen: (val: boolean) => void;
  onEditLink: () => void;
  onAddComment: (commentId: string) => void;
}

export const EditorFloatingMenus: React.FC<EditorFloatingMenusProps> = ({
  editor,
  tableCreatorOpen,
  setTableCreatorOpen,
  insertTable,
  aiPromptOpen,
  setAiPromptOpen,
  onEditLink,
  onAddComment,
}) => {
  const isEditable = useIsEditable(editor);

  return (
    <>
      {/* Popups & Menus that float above editor */}
      {editor && isEditable && <TableBubbleToolbar editor={editor} />}
      {editor && isEditable && <LinkBubbleMenu editor={editor} onEditLink={onEditLink} />}
      {editor && isEditable && <SelectionBubbleMenu editor={editor} onAddComment={onAddComment} />}

      {isEditable && <TableCreatorDialog
        open={tableCreatorOpen}
        onClose={() => setTableCreatorOpen(false)}
        onSubmit={insertTable}
      />}

      {isEditable && <AIPromptBar
        open={aiPromptOpen}
        onClose={() => setAiPromptOpen(false)}
        editor={editor}
      />}
    </>
  );
};

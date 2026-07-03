import React from "react";
import { TableBubbleToolbar } from "../TableBubbleToolbar";
import { TableCreatorDialog } from "../TableCreatorDialog";
import { AIPromptBar } from "../AIPromptBar";
import { Popover } from "@mui/material";

export interface EditorFloatingMenusProps {
  editor: any;
  tableCreatorOpen: boolean;
  setTableCreatorOpen: (val: boolean) => void;
  insertTable: (rows: number, cols: number, withHeader: boolean) => void;
  aiPromptOpen: boolean;
  setAiPromptOpen: (val: boolean) => void;
  menuOpen: boolean;
  menuAnchorEl: any;
  setMenuOpen: (val: boolean) => void;
  menuStateRef: any;
  handleUserMentionSelect: (user: any) => void;
  handleCommandSelect: (cmd: any) => void;
}

export const EditorFloatingMenus: React.FC<EditorFloatingMenusProps> = ({
  editor,
  tableCreatorOpen,
  setTableCreatorOpen,
  insertTable,
  aiPromptOpen,
  setAiPromptOpen,
  menuOpen,
  menuAnchorEl,
  setMenuOpen,
  menuStateRef,
  handleUserMentionSelect,
  handleCommandSelect,
}) => {
  return (
    <>
      {/* Popups & Menus that float above editor */}
      {editor && <TableBubbleToolbar editor={editor} />}

      <TableCreatorDialog
        open={tableCreatorOpen}
        onClose={() => setTableCreatorOpen(false)}
        onSubmit={insertTable}
      />

      <AIPromptBar
        open={aiPromptOpen}
        onClose={() => setAiPromptOpen(false)}
        editor={editor}
      />

      {/* Slash Commands & Mentions Menu */}
      <Popover
        open={menuOpen}
        anchorEl={menuAnchorEl}
        onClose={() => setMenuOpen(false)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        disableAutoFocus
        disableEnforceFocus
      >
        <div className="flex flex-col max-h-64 overflow-y-auto bg-gray-900 border border-gray-700 rounded shadow-xl min-w-[200px]">
          {menuStateRef.current.menuMode === "slash" ? (
            menuStateRef.current.filteredCommands.length > 0 ? (
              menuStateRef.current.filteredCommands.map(
                (cmd: any, i: number) => (
                  <div
                    key={cmd.id}
                    onClick={() => handleCommandSelect(cmd)}
                    className={`px-3 py-2 cursor-pointer text-sm flex items-center space-x-2 ${
                      menuStateRef.current.selectedIndex === i
                        ? "bg-purple-600 text-white"
                        : "text-gray-200 hover:bg-gray-800"
                    }`}
                  >
                    <span className="opacity-70">{cmd.icon}</span>
                    <span>{cmd.label}</span>
                  </div>
                ),
              )
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">
                No matching commands
              </div>
            )
          ) : menuStateRef.current.filteredUsers.length > 0 ? (
            menuStateRef.current.filteredUsers.map((user: any, i: number) => (
              <div
                key={user.id}
                onClick={() => handleUserMentionSelect(user)}
                className={`px-3 py-2 cursor-pointer text-sm flex items-center space-x-2 ${
                  menuStateRef.current.selectedIndex === i
                    ? "bg-blue-600 text-white"
                    : "text-gray-200 hover:bg-gray-800"
                }`}
              >
                <span>@{user.username}</span>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              No matching users
            </div>
          )}
        </div>
      </Popover>
    </>
  );
};

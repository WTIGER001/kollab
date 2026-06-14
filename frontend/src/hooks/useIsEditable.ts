import { useState, useEffect } from "react";
import type { Editor } from "@tiptap/core";

export const useIsEditable = (editor: Editor | null | undefined): boolean => {
  const [isEditable, setIsEditable] = useState(editor?.isEditable ?? true);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const handleUpdate = () => {
      setIsEditable(editor.isEditable);
    };

    editor.on("update", handleUpdate);
    editor.on("transaction", handleUpdate);

    // Initial check in case it changed before mount/effect setup
    setIsEditable(editor.isEditable);

    return () => {
      editor.off("update", handleUpdate);
      editor.off("transaction", handleUpdate);
    };
  }, [editor]);

  return isEditable;
};

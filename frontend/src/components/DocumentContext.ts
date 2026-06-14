import { createContext } from "react";
import type { DocumentItem } from "./Sidebar";

export interface DocumentContextProps {
  documents: DocumentItem[];
  activeDocId: string | null;
  onSelectDoc: (id: string) => void;
}

export const DocumentContext = createContext<DocumentContextProps | null>(null);

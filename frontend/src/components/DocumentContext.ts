import { createContext } from "react";
import type { DocumentItem } from "./Sidebar";

export interface DocumentContextProps {
  documents: DocumentItem[];
  activeDocId: string | null;
  onSelectDoc: (id: string) => void;
  selectedTeamId?: string | null;
}

export const DocumentContext = createContext<DocumentContextProps | null>(null);

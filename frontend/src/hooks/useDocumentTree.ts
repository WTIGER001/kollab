import { useMemo } from 'react';
import type { Document } from '../services/api';
import type { DocumentItem } from '../components/Sidebar';

export const buildDocumentTree = (flatDocs: Document[]): DocumentItem[] => {
  const map: Record<string, DocumentItem & { parentId: string | null }> = {};
  const roots: DocumentItem[] = [];

  // First pass: instantiate nodes
  flatDocs.forEach(doc => {
    map[doc.id] = {
      id: doc.id,
      title: doc.title,
      isFolder: false,
      content: doc.content,
      children: [],
      parentId: doc.parentId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      createdBy: doc.createdBy,
      updatedBy: doc.updatedBy,
      deletedAt: doc.deletedAt,
    } as any;
  });

  // Second pass: link parents and children
  flatDocs.forEach(doc => {
    const node = map[doc.id];
    if (doc.parentId && map[doc.parentId]) {
      map[doc.parentId].isFolder = true; // folder if it has children
      map[doc.parentId].children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

export const useDocumentTree = (flatDocs: Document[] | undefined) => {
  return useMemo(() => {
    if (!flatDocs) return [];
    return buildDocumentTree(flatDocs);
  }, [flatDocs]);
};

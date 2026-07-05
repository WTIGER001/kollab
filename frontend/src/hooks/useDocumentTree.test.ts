import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentTree, buildDocumentTree } from './useDocumentTree';
import type { Document } from '../services/api';

describe('useDocumentTree', () => {
  it('returns empty array when flatDocs is undefined or empty', () => {
    const { result: r1 } = renderHook(() => useDocumentTree(undefined));
    expect(r1.current).toEqual([]);
    
    const { result: r2 } = renderHook(() => useDocumentTree([]));
    expect(r2.current).toEqual([]);
  });

  describe('buildDocumentTree', () => {
    it('builds a simple tree with no parents', () => {
      const flatDocs: Document[] = [
        { id: '1', title: 'Doc 1', content: '', parentId: null } as Document,
        { id: '2', title: 'Doc 2', content: '', parentId: null } as Document,
      ];
      
      const tree = buildDocumentTree(flatDocs);
      
      expect(tree).toHaveLength(2);
      expect(tree[0].id).toBe('1');
      expect(tree[0].isFolder).toBe(false);
      expect(tree[1].id).toBe('2');
    });

    it('nests children under their parents and marks parents as folders', () => {
      const flatDocs: Document[] = [
        { id: 'root', title: 'Root', content: '', parentId: null } as Document,
        { id: 'child-1', title: 'Child 1', content: '', parentId: 'root' } as Document,
        { id: 'child-2', title: 'Child 2', content: '', parentId: 'root' } as Document,
        { id: 'grandchild', title: 'Grandchild', content: '', parentId: 'child-1' } as Document,
      ];
      
      const tree = buildDocumentTree(flatDocs);
      
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('root');
      expect(tree[0].isFolder).toBe(true);
      expect(tree[0].children).toHaveLength(2);
      
      const child1 = tree[0].children?.find(c => c.id === 'child-1');
      expect(child1?.isFolder).toBe(true);
      expect(child1?.children).toHaveLength(1);
      expect(child1?.children?.[0].id).toBe('grandchild');
    });
  });
});

/**
 * Returns the requested parent for a new page. A null parent is intentional:
 * it creates a top-level page within the selected team or project space.
 */
export const resolveDocumentParent = (
  requestedParentId: string | null | undefined,
  pendingParentId: string | undefined,
): string | null => requestedParentId ?? pendingParentId ?? null;

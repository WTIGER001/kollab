import DOMPurify from 'dompurify';

// Macro content may originate in another user's page or an imported archive.
export const sanitizeMarkup = (markup: string): string => DOMPurify.sanitize(markup, {
  USE_PROFILES: { html: true, svg: true, svgFilters: true },
  FORBID_TAGS: ['foreignObject', 'iframe', 'form'],
});

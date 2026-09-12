import { describe, expect, it } from 'vitest';
import { sanitizeMarkup } from './markup';

describe('macro markup', () => {
  it('removes executable HTML and SVG while retaining document formatting', () => {
    const result = sanitizeMarkup('<p><strong>Safe</strong></p><img src="x" onerror="alert(1)"><svg onload="alert(1)"><script>alert(1)</script><circle r="4" /></svg>');
    expect(result).toContain('<strong>Safe</strong>');
    expect(result).toContain('<circle');
    expect(result).not.toMatch(/onerror|onload|<script/);
  });
  it('rejects embedded frames and javascript links', () => {
    expect(sanitizeMarkup('<iframe src="https://example.test"></iframe><a href="javascript:alert(1)">link</a>')).not.toMatch(/iframe|javascript:/);
  });
});

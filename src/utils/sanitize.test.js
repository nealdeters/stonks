import { describe, it, expect } from 'vitest';
import { escapeHtml } from './sanitize';

describe('sanitize', () => {
  it('escapeHtml escapes special characters', () => {
    const input = '<script>alert("xss")</script>';
    const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
    expect(escapeHtml(input)).toBe(expected);
  });
});
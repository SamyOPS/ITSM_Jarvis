import { describe, expect, it } from 'vitest';
import { normalizeApiUrl } from './env';

describe('normalizeApiUrl', () => {
  it('removes trailing slashes from the configured API URL', () => {
    expect(normalizeApiUrl('http://127.0.0.1:3000/')).toBe(
      'http://127.0.0.1:3000',
    );
    expect(normalizeApiUrl('http://127.0.0.1:3000///')).toBe(
      'http://127.0.0.1:3000',
    );
  });

  it('uses the local backend when the configured API URL is empty', () => {
    expect(normalizeApiUrl(undefined)).toBe('http://localhost:3000');
    expect(normalizeApiUrl('   ')).toBe('http://localhost:3000');
  });
});

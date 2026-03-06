import { describe, expect, it } from 'vitest';
import { maskSensitive } from '../src/lib/mask';

describe('maskSensitive', () => {
  it('masks all but last 4 chars', () => {
    expect(maskSensitive('123456789012')).toBe('********9012');
  });

  it('masks short values fully', () => {
    expect(maskSensitive('1234')).toBe('****');
  });
});

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { canonicalize } from './canonical.js';

describe('canonicalize', () => {
  it('should correctly canonicalize simple values', () => {
    expect(canonicalize(null)).toBe('null');
    expect(canonicalize(1)).toBe('1');
    expect(canonicalize('test')).toBe('"test"');
    expect(canonicalize([1, 2])).toBe('[1,2]');
  });

  it('should sort object keys deterministically', () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    expect(canonicalize(obj1)).toBe('{"a":1,"b":2}');
    expect(canonicalize(obj2)).toBe('{"a":1,"b":2}');
  });

  it('should drop undefined values', () => {
    const obj = { a: 1, b: undefined };
    expect(canonicalize(obj)).toBe('{"a":1}');
  });

  it('property test: same object shape yields same canonical string regardless of insertion order', () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string(), fc.string()), (dict) => {
        const keys = Object.keys(dict);
        const shuffledKeys = [...keys].sort(() => Math.random() - 0.5);
        const shuffledDict: Record<string, string> = {};
        for (const k of shuffledKeys) {
          Object.defineProperty(shuffledDict, k, {
            value: dict[k],
            enumerable: true,
            writable: true,
            configurable: true,
          });
        }
        expect(canonicalize(dict)).toBe(canonicalize(shuffledDict));
      }),
    );
  });
});

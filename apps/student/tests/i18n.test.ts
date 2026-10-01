import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { globSync } from 'glob';

describe('i18n', () => {
  it('should not contain hardcoded strings in JSX', () => {
    const files = globSync('src/**/*.tsx', { cwd: __dirname + '/..' });
    
    // Match simple English strings inside JSX tags like >Hello<
    const hardcodedRegex = />([A-Za-z][a-zA-Z\s]*)<\//g;

    const violations: string[] = [];

    files.forEach(file => {
      const content = readFileSync(__dirname + '/../' + file, 'utf-8');
      let match;
      while ((match = hardcodedRegex.exec(content)) !== null) {
        const text = match[1].trim();
        // Ignore simple punctuation or empty strings
        if (text && /[a-zA-Z]/.test(text)) {
          violations.push(`${file}: "${text}"`);
        }
      }
    });

    expect(violations).toEqual([]);
  });
});

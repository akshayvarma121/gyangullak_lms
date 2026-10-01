import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';

describe('i18n', () => {
  it('should not contain hardcoded strings in JSX', () => {
    const srcDir = __dirname + '/../src';
    const files = readdirSync(srcDir, { recursive: true })
      .filter((f: any) => typeof f === 'string' && f.endsWith('.tsx'))
      .map((f: any) => 'src/' + f.replace(/\\/g, '/'));
    
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

import { createHash } from 'crypto';
import { Chapter } from './schema.js';

export function buildBundle(chapters: Chapter[], version: number) {
  chapters.sort((a, b) => a.id.localeCompare(b.id));

  const content = {
    version,
    chapters,
  };

  const jsonString = JSON.stringify(content);
  const hash = createHash('sha256').update(jsonString).digest('hex');

  const bundle = {
    version,
    hash,
    chapters,
  };

  return {
    studentBundle: bundle,
    serverBundle: bundle,
  };
}

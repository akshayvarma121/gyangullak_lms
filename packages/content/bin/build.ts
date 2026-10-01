import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { validateChapter } from '../src/validator.js';
import { buildBundle } from '../src/builder.js';
import { Chapter } from '../src/schema.js';

const contentDir = process.argv[2] || 'content';
const outDir = process.argv[3] || 'dist';
const isRelease = process.env.NODE_ENV === 'production';

console.log(
  `Building content from ${contentDir} (release: ${String(isRelease)})...`,
);

let hasErrors = false;
const chapters: Chapter[] = [];

try {
  const files = readdirSync(contentDir).filter(
    (f) => f.endsWith('.yaml') || f.endsWith('.yml'),
  );
  for (const file of files) {
    const fullPath = join(contentDir, file);
    const content = readFileSync(fullPath, 'utf-8');
    const result = validateChapter(content);

    if (!result.success) {
      console.error(`\n❌ Validation error in ${file}:`);
      result.errors.forEach((err) => {
        console.error(`  - ${err}`);
      });
      hasErrors = true;
      continue;
    }

    const chapter = result.data;

    if (isRelease) {
      const drafts = chapter.questions.filter(
        (q) => q.review_status === 'draft',
      );
      if (drafts.length > 0) {
        console.error(
          `\n❌ Release build failed: ${file} contains ${String(drafts.length)} draft question(s).`,
        );
        hasErrors = true;
      }
    }

    chapters.push(chapter);
  }
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error reading directory ${contentDir}: ${message}`);
  process.exit(1);
}

if (hasErrors) {
  console.error('\nBuild failed.');
  process.exit(1);
}

const { studentBundle, serverBundle } = buildBundle(chapters, 1);

try {
  mkdirSync(outDir, { recursive: true });
} catch {
  // directory exists
}

const studentPath = join(outDir, 'content.json');
const serverPath = join(outDir, 'server-content.json');

const studentStr = JSON.stringify(studentBundle, null, 2);
const serverStr = JSON.stringify(serverBundle, null, 2);

writeFileSync(studentPath, studentStr);
writeFileSync(serverPath, serverStr);

const studentSize = Buffer.byteLength(studentStr, 'utf8');
const serverSize = Buffer.byteLength(serverStr, 'utf8');

console.log(`\n🎉 Build successful!`);
console.log(`- ${studentPath}: ${(studentSize / 1024).toFixed(2)} KB`);
console.log(`- ${serverPath}: ${(serverSize / 1024).toFixed(2)} KB`);
console.log(`Bundle hash: ${studentBundle.hash}`);
process.exit(0);

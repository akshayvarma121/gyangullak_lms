import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { validateChapter } from '../src/validator.js';

const contentDir = process.argv[2] || 'content';

console.log(`Validating content in ${contentDir}...`);

let hasErrors = false;
let fileCount = 0;

try {
  const files = readdirSync(contentDir).filter(
    (f) => f.endsWith('.yaml') || f.endsWith('.yml'),
  );
  for (const file of files) {
    fileCount++;
    const fullPath = join(contentDir, file);
    const content = readFileSync(fullPath, 'utf-8');
    const result = validateChapter(content);
    if (!result.success) {
      console.error(`\n❌ Error in ${file}:`);
      result.errors.forEach((err) => {
        console.error(`  - ${err}`);
      });
      hasErrors = true;
    } else {
      console.log(`✅ ${file} passed validation.`);
    }
  }
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error reading directory ${contentDir}: ${message}`);
  process.exit(1);
}

if (hasErrors) {
  console.error('\nValidation failed.');
  process.exit(1);
}

console.log(`\n🎉 Successfully validated ${String(fileCount)} files.`);
process.exit(0);

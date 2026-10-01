import { execSync } from 'child_process';

const legacyNames = [
  'Gyan Seth',
  'gyanseth',
  'gyan-seth',
  'School Chale Hum',
  'schoolchalehum',
  'Vidya Points',
  'Vidya',
  'Pathshala',
  'Gurukul',
];

// Combine into a case-insensitive regex
const regex = legacyNames.join('|');

try {
  // Use git grep to find matches. We exclude docs/adr/003-brand-name-standardization.md
  // and any CHANGELOG.md file.
  // git grep returns 1 if no matches are found.
  const command = `git grep -i -E "${regex}" -- ":!docs/adr/003-brand-name-standardization.md" ":!CHANGELOG.md" ":!scripts/check-names.js"`;
  
  let output = '';
  try {
    output = execSync(command, { encoding: 'utf-8' });
  } catch (err) {
    // git grep exits with 1 when no matches are found, which is what we want!
    if (err.status === 1 && !err.stdout) {
      console.log('check:names passed! No legacy names found.');
      process.exit(0);
    } else {
      throw err;
    }
  }

  // If we reach here, output contains matches
  if (output.trim()) {
    console.error('ERROR: Found legacy names in the codebase:\n');
    console.error(output);
    process.exit(1);
  }

} catch (err) {
  console.error('An error occurred running check-names script:', err.message);
  process.exit(1);
}

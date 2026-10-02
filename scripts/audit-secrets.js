const fs = require('fs');
const path = require('path');

const dirsToScan = ['apps/student/src', 'apps/hub/src', 'packages/core/src', 'packages/brand/src'];
const sensitiveKeywords = ['SUPABASE_SERVICE_ROLE_KEY', 'service_role', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaG9vbGNoYWxlaHVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSJ9'];

let foundSecrets = false;

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const keyword of sensitiveKeywords) {
        if (content.includes(keyword)) {
          console.error(`\x1b[31mSECRET LEAK FOUND\x1b[0m: '${keyword}' discovered in ${fullPath}`);
          foundSecrets = true;
        }
      }
    }
  }
}

console.log('Running secrets scan across client bundles...');
for (const dir of dirsToScan) {
  scanDir(path.join(__dirname, '..', dir));
}

if (foundSecrets) {
  console.error('\x1b[31mAudit Failed! Service keys or sensitive data found in client paths.\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32mAudit Passed: No service keys found in client bundles.\x1b[0m');
}

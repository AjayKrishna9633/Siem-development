const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

let errors = 0;

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

console.log("Checking project standards...");

const args = process.argv.slice(2);
const filesToCheck = [];

if (args.length > 0) {
  // Check specific files provided by lint-staged
  filesToCheck.push(...args);
} else {
  // Check the whole src directory
  walkDir(srcDir, (filePath) => filesToCheck.push(filePath));
}

filesToCheck.forEach((filePath) => {
  if (!filePath.endsWith('.ts')) return;
  
  // Ensure the file exists (lint-staged might pass deleted files sometimes depending on config)
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');

  // Rule: No 'any'
  if (content.match(/: \s*any\b/g)) {
    console.error(`[ERROR] Found 'any' type in ${filePath}`);
    errors++;
  }

  // Rule: No 'console.*' (warn until WinstonLogger service is implemented)
  if (content.match(/console\.(log|error|warn|info)/g)) {
    console.warn(`[WARN] Found 'console.*' in ${filePath} (to be replaced with ILogger)`);
  }

  // Rule: Interfaces must start with 'I'
  const interfaceMatches = content.match(/export interface ([a-zA-Z]+)/g);
  if (interfaceMatches) {
    interfaceMatches.forEach(match => {
      const name = match.split(' ')[2];
      if (name && name[0] !== 'I') {
        console.error(`[ERROR] Interface '${name}' must start with 'I' in ${filePath}`);
        errors++;
      }
    });
  }
});

if (errors > 0) {
  console.error(`\nFailed with ${errors} standard violations. Please fix them.`);
  process.exit(1);
} else {
  console.log("\nAll custom standard checks passed! (ESLint will catch the rest)");
  process.exit(0);
}

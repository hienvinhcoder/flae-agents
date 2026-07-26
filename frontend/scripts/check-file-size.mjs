import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const MAX_LINES = 450;
const ROOT = process.cwd();
const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx']);
const EXCLUDED_DIRECTORIES = new Set([
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);

function isHandwrittenTypeScript(filePath) {
  const baseName = path.basename(filePath);
  if (baseName.endsWith('.d.ts')) return false;
  if (baseName.includes('.generated.') || baseName.includes('.gen.')) return false;
  return SCANNED_EXTENSIONS.has(path.extname(baseName));
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.storybook') continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) files.push(...await collectFiles(entryPath));
    } else if (entry.isFile() && isHandwrittenTypeScript(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

const files = await collectFiles(ROOT);
const violations = [];

for (const filePath of files) {
  const content = await readFile(filePath, 'utf8');
  const lineCount = content === ''
    ? 0
    : content.split(/\r?\n/).length - Number(/\r?\n$/.test(content));
  if (lineCount > MAX_LINES) {
    violations.push({ filePath: path.relative(ROOT, filePath), lineCount });
  }
}

if (violations.length > 0) {
  console.error(`TypeScript files must not exceed ${MAX_LINES} lines:`);
  for (const violation of violations.sort((left, right) => right.lineCount - left.lineCount)) {
    console.error(`- ${violation.filePath}: ${violation.lineCount}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Checked ${files.length} TypeScript files; all are within ${MAX_LINES} lines.`);
}

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const roots = ['app', 'components', 'lib'];
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const findings = [];

const protectedModules = [
  '@/lib/n3uralia-intelligence-engine',
  '@/lib/n3uralia-intelligence-gateway',
  'lib/n3uralia-intelligence-engine',
  'lib/n3uralia-intelligence-gateway',
];

const forbiddenResponseTerms = [
  /systemPrompt/i,
  /chainOfThought/i,
  /reasoningTrace/i,
  /internalRules/i,
  /scoringRules/i,
  /promptVersion/i,
];

const sensitiveLogTerms = [
  /console\.(log|info|debug)\s*\([^\n]*(token|secret|password|cookie|authorization|prompt|payload|document)/i,
  /JSON\.stringify\s*\([^\n]*(request|body|payload|document|canonical)/i,
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', 'dist', 'coverage'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (extensions.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function importsProtectedModule(text) {
  return protectedModules.some((moduleName) => text.includes(moduleName));
}

for (const relRoot of roots) {
  for (const file of walk(path.join(root, relRoot))) {
    const rel = path.relative(root, file).replaceAll('\\', '/');
    const text = fs.readFileSync(file, 'utf8');
    const isClient = /^\s*['\"]use client['\"];?/m.test(text);
    const isApi = /^app\/api\//.test(rel) && /route\.(ts|js)$/.test(rel);

    if (isClient && importsProtectedModule(text)) {
      findings.push(`${rel}: client module imports a protected N3uralia server module`);
    }

    if (isClient && /server-only/.test(text)) {
      findings.push(`${rel}: client module references server-only material`);
    }

    if (isApi) {
      for (const pattern of forbiddenResponseTerms) {
        if (pattern.test(text) && /(NextResponse\.json|Response\(|JSON\.stringify)/.test(text)) {
          findings.push(`${rel}: API may expose internal implementation term ${pattern}`);
        }
      }

      if (/\b(local|remote|parity)\s*[:,]/.test(text) && importsProtectedModule(text)) {
        findings.push(`${rel}: API may expose internal runtime objects instead of a minimal DTO`);
      }
    }

    for (const pattern of sensitiveLogTerms) {
      if (pattern.test(text)) findings.push(`${rel}: potentially sensitive logging pattern ${pattern}`);
    }
  }
}

if (findings.length) {
  console.error('N3uralia exposure boundary audit failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('N3uralia exposure boundary audit passed.');

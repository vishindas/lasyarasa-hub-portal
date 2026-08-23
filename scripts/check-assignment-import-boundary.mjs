#!/usr/bin/env node
// Enforces the one dependency-direction invariant Slice 15's answer-key
// isolation design depends on (Plan v2.1.2 §8.2/§13.3): no file under
// core/** may import anything from features/assignments/data-access/**
// (the answer-key-bearing model + the two answer-key-bearing API
// services). The reverse direction (features -> core) is normal and
// expected and is NOT asserted here.
//
// This is defense-in-depth, not the security boundary -- the real boundary
// is the backend role guard on every endpoint that returns these shapes.
//
// IMPLEMENTATION NOTE (discovered during Slice 15 implementation, not
// anticipated by the accepted plan): this check cannot run inside `ng test`
// -- Angular's @angular/build:unit-test compiles every spec file through
// the same browser-target esbuild pipeline used for the app bundle, which
// rejects Node built-ins (`fs`, `path`, `__dirname`) as unresolvable
// modules. A .spec.ts file using the TypeScript compiler API to walk the
// real filesystem therefore cannot be a Vitest spec in this codebase. This
// script is the same check, run instead as a plain Node script outside
// Angular's builder (via `npm run check:assignment-import-boundary`), using
// the same `typescript` package already a devDependency -- no new
// dependency was added. This is a disclosed adaptation of the accepted
// plan's "Jasmine spec" wording to the actual constraints of this
// repository's test infrastructure, not an invented substitute.
//
// Slice 16 boundary: once a features/student-assignments/** (or
// equivalent) directory exists, extend this script to also assert neither
// direction crosses that boundary. Until then that half of the check is a
// no-op (there is nothing yet to import from either side).

import * as ts from 'typescript';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const srcAppRoot = path.resolve(projectRoot, 'src/app');
const forbiddenTargetDir = path.resolve(srcAppRoot, 'features/assignments/data-access');
const coreDir = path.resolve(srcAppRoot, 'core');
const studentAssignmentsDir = path.resolve(srcAppRoot, 'features/student-assignments');

function listTsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.isFile() && /\.ts$/.test(entry.name) && !/\.spec\.ts$/.test(entry.name)) out.push(full);
  }
  return out;
}

function importSpecifiers(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const specifiers = [];
  sourceFile.forEachChild(node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
    }
  });
  return specifiers;
}

function resolvesInto(filePath, specifier, targetDir) {
  if (!specifier.startsWith('.')) return false;
  const resolved = path.resolve(path.dirname(filePath), specifier);
  const normalizedTarget = targetDir.replace(/\\/g, '/');
  const normalizedResolved = resolved.replace(/\\/g, '/');
  return normalizedResolved === normalizedTarget || normalizedResolved.startsWith(normalizedTarget + '/');
}

function checkDirection(fromDir, intoDir) {
  const violations = [];
  for (const file of listTsFiles(fromDir)) {
    for (const specifier of importSpecifiers(file)) {
      if (resolvesInto(file, specifier, intoDir)) {
        violations.push(`${path.relative(projectRoot, file)} imports "${specifier}"`);
      }
    }
  }
  return violations;
}

let violations = checkDirection(coreDir, forbiddenTargetDir);

if (fs.existsSync(studentAssignmentsDir)) {
  violations = violations.concat(checkDirection(studentAssignmentsDir, forbiddenTargetDir));
  violations = violations.concat(checkDirection(forbiddenTargetDir, studentAssignmentsDir));
} else {
  console.log('(Slice 16 features/student-assignments/** does not exist yet -- that half of the boundary check is a no-op until it does.)');
}

if (violations.length > 0) {
  console.error('Answer-key isolation boundary violated:');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log('OK: no core/** file imports from features/assignments/data-access/**.');

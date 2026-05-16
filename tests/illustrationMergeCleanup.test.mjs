import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', 'dist', 'node_modules']);
const CONFLICT_MARKERS = ['<'.repeat(7), '='.repeat(7), '>'.repeat(7)];

function* walkFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

test('repository has no unresolved merge conflict markers in tracked source files', () => {
  const conflictedFiles = [];

  for (const filePath of walkFiles(REPO_ROOT)) {
    const relativePath = path.relative(REPO_ROOT, filePath);
    const source = fs.readFileSync(filePath, 'utf8');
    const hasConflictMarker = source
      .split(/\r?\n/u)
      .some((line) => CONFLICT_MARKERS.some((marker) => line === marker || line.startsWith(`${marker} `)));
    if (hasConflictMarker) {
      conflictedFiles.push(relativePath);
    }
  }

  assert.deepEqual(conflictedFiles, []);
});

test('cardVisualLayout keeps exactly one merged artwork resolver and renderer', () => {
  const source = readRepoFile('src/rendering/cardVisualLayout.js');

  assert.equal((source.match(/function getCardArtTextureKey\(/g) ?? []).length, 1);
  assert.equal((source.match(/export function createCardArtwork\(/g) ?? []).length, 1);
  assert.match(source, /function getCardArtTextureKey\(scene, card, \{ enableCardIllustration = false \} = \{\}\)/);
  assert.match(source, /const explicitTextureKey = card\?\.artTextureKey \?\? card\?\.artKey \?\? card\?\.art\?\.textureKey \?\? null;/);
  assert.match(source, /getLoadedCardIllustrationTextureKey\(scene, card\)/);
  assert.match(source, /export function createCardArtwork\(scene, zone, card, options = \{\}\)/);
  assert.match(source, /return createArtPlaceholder\(scene, zone\);/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { baseName, isSameOrDescendant, joinPath, parentDir } from './drag';

test('parentDir returns parent directory path or empty string for root-level files', () => {
  assert.equal(parentDir('foo/bar/baz.md'), 'foo/bar');
  assert.equal(parentDir('root.md'), '');
  assert.equal(parentDir('a/b'), 'a');
});

test('baseName returns the last path segment', () => {
  assert.equal(baseName('foo/bar/baz.md'), 'baz.md');
  assert.equal(baseName('root.md'), 'root.md');
  assert.equal(baseName('dir'), 'dir');
});

test('joinPath joins a directory and a name, treating empty dir as root', () => {
  assert.equal(joinPath('', 'file.md'), 'file.md');
  assert.equal(joinPath('docs', 'file.md'), 'docs/file.md');
  assert.equal(joinPath('docs/nested', 'file.md'), 'docs/nested/file.md');
});

test('isSameOrDescendant detects when a path is inside or equal to another', () => {
  assert.equal(isSameOrDescendant('a/b/c.md', 'a/b'), true);
  assert.equal(isSameOrDescendant('a/b', 'a/b'), true);
  assert.equal(isSameOrDescendant('a/bc.md', 'a/b'), false);
  assert.equal(isSameOrDescendant('x.md', ''), true);
});

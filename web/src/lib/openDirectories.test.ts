import test from 'node:test';
import assert from 'node:assert/strict';
import { collectDirectoryPaths, pruneDirectoryPaths, setDirectoryPathOpen } from './openDirectories';
import type { FileNode } from '../../../src/types';

test('collectDirectoryPaths returns nested directory paths in tree order', () => {
  const nodes: FileNode[] = [{
    name: 'docs',
    path: 'docs',
    type: 'directory',
    children: [{
      name: 'guides',
      path: 'docs/guides',
      type: 'directory',
      children: [{
        name: 'intro.md',
        path: 'docs/guides/intro.md',
        type: 'file',
      }],
    }, {
      name: 'readme.md',
      path: 'docs/readme.md',
      type: 'file',
    }],
  }, {
    name: 'notes.md',
    path: 'notes.md',
    type: 'file',
  }];

  assert.deepEqual(collectDirectoryPaths(nodes), ['docs', 'docs/guides']);
});

test('setDirectoryPathOpen is idempotent for repeated open and close operations', () => {
  const opened = setDirectoryPathOpen([], 'docs', true);

  assert.deepEqual(opened, ['docs']);
  assert.equal(setDirectoryPathOpen(opened, 'docs', true), opened);

  const closed = setDirectoryPathOpen(opened, 'docs', false);
  assert.deepEqual(closed, []);
  assert.equal(setDirectoryPathOpen(closed, 'docs', false), closed);
});

test('pruneDirectoryPaths drops stale entries and preserves valid ones', () => {
  assert.deepEqual(
    pruneDirectoryPaths(['docs', 'stale', 'docs/guides'], ['docs', 'docs/guides']),
    ['docs', 'docs/guides'],
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { filesRoute, parseAppRoute } from './router';

test('parseAppRoute accepts bare file paths', () => {
  assert.deepEqual(parseAppRoute('/docs/Hello%20World.md'), {
    kind: 'files',
    path: 'docs/Hello World.md',
  });
});

test('parseAppRoute keeps legacy /files routes working', () => {
  assert.deepEqual(parseAppRoute('/files/docs/Hello%20World.md'), {
    kind: 'files',
    path: 'docs/Hello World.md',
  });
});

test('filesRoute appends hashes when requested', () => {
  assert.equal(filesRoute('docs/Hello World.md', { hash: 'hello-world' }), '/files/docs/Hello%20World.md#hello-world');
});

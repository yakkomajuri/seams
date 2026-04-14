import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHeadingAnchorSlugs,
  decodeHeadingHash,
  headingAnchorSlug,
} from './headingAnchors';

test('headingAnchorSlug normalizes accented latin characters and symbols', () => {
  assert.equal(
    headingAnchorSlug('Crème brûlée & déjà vu'),
    'creme-brulee-and-deja-vu',
  );
  assert.equal(
    headingAnchorSlug('Straße Æsir smørrebrød'),
    'strasse-aesir-smorrebrod',
  );
});

test('headingAnchorSlug preserves non-latin letters when possible', () => {
  assert.equal(headingAnchorSlug('こんにちは 世界'), 'こんにちは-世界');
});

test('buildHeadingAnchorSlugs appends numeric suffixes for duplicates', () => {
  assert.deepEqual(
    buildHeadingAnchorSlugs(['Hello World', 'Hello World', '', 'Hello World']),
    ['hello-world', 'hello-world-2', 'section', 'hello-world-3'],
  );
});

test('decodeHeadingHash decodes escaped hashes safely', () => {
  assert.equal(decodeHeadingHash('#stra%C3%9Fe'), 'straße');
  assert.equal(decodeHeadingHash('#already-decoded'), 'already-decoded');
});

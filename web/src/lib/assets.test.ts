import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAssetUrl,
  normalizeAssetsDir,
  servesAssetsFromRoot,
} from '../../../src/services/assets';

test('normalizeAssetsDir trims leading dot-slashes and trailing slashes', () => {
  assert.equal(normalizeAssetsDir('./public/'), 'public');
  assert.equal(normalizeAssetsDir('assets'), 'assets');
  assert.equal(normalizeAssetsDir(''), 'assets');
});

test('servesAssetsFromRoot detects public directories', () => {
  assert.equal(servesAssetsFromRoot('./public'), true);
  assert.equal(servesAssetsFromRoot('./sites/docs/public'), true);
  assert.equal(servesAssetsFromRoot('./assets'), false);
});

test('buildAssetUrl keeps public assets at root and other assets under /assets', () => {
  assert.equal(buildAssetUrl('./public', 'images/hero.png'), '/images/hero.png');
  assert.equal(buildAssetUrl('./assets', 'images/hero.png'), '/assets/images/hero.png');
});

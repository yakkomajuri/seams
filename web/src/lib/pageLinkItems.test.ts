import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPageUrl } from './pageLinkItems';

test('buildPageUrl strips extension and adds leading slash', () => {
  assert.equal(buildPageUrl('about.md', ''), '/about');
  assert.equal(buildPageUrl('posts/hello.mdx', ''), '/posts/hello');
});

test('buildPageUrl strips leading ./', () => {
  assert.equal(buildPageUrl('./docs/intro.md', ''), '/docs/intro');
});

test('buildPageUrl strips index suffix', () => {
  assert.equal(buildPageUrl('about/index.md', ''), '/about');
  assert.equal(buildPageUrl('./pages/index.mdx', ''), '/pages');
});

test('buildPageUrl prepends linkRoot', () => {
  assert.equal(buildPageUrl('about.md', '/blog'), '/blog/about');
  assert.equal(buildPageUrl('posts/hello.md', '/blog'), '/blog/posts/hello');
});

test('buildPageUrl trims trailing slash from linkRoot', () => {
  assert.equal(buildPageUrl('about.md', '/blog/'), '/blog/about');
});

test('buildPageUrl handles empty linkRoot', () => {
  assert.equal(buildPageUrl('readme.txt', ''), '/readme');
});

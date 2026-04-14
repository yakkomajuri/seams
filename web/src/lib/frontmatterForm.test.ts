import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FrontmatterForm from '../components/FrontmatterForm';

test('FrontmatterForm renders object-valued frontmatter as nested fields', () => {
  const html = renderToStaticMarkup(
    React.createElement(FrontmatterForm, {
      frontmatter: {
        metadata: {
          slug: 'hello-world',
          seo: {
            title: 'Hello World',
          },
        },
      },
      onChange: () => {},
    }),
  );

  assert.match(html, /metadata/);
  assert.match(html, /slug/);
  assert.match(html, /hello-world/);
  assert.match(html, /seo/);
  assert.match(html, /Hello World/);
  assert.ok(!html.includes('[object Object]'));
});

test('FrontmatterForm renders arrays of objects as nested items', () => {
  const html = renderToStaticMarkup(
    React.createElement(FrontmatterForm, {
      frontmatter: {
        authors: [
          { name: 'Ada' },
          { name: 'Grace' },
        ],
      },
      onChange: () => {},
    }),
  );

  assert.match(html, /authors/);
  assert.match(html, /\[0\]/);
  assert.match(html, /\[1\]/);
  assert.match(html, /Ada/);
  assert.match(html, /Grace/);
  assert.ok(!html.includes('[object Object]'));
});

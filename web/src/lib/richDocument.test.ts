import test from 'node:test';
import assert from 'node:assert/strict';
import { exportRichDocument, importRichDocument } from './richDocument';

function createFakeEditor() {
  const calls: string[] = [];

  return {
    calls,
    async tryParseMarkdownToBlocks(markdown: string) {
      calls.push(markdown);

      if (markdown === 'Summary') {
        return [{
          type: 'paragraph',
          content: 'Summary',
          children: [],
        }];
      }

      if (markdown === 'First line') {
        return [{
          type: 'paragraph',
          content: 'First line',
          children: [],
        }];
      }

      if (markdown === 'Hidden body') {
        return [{
          type: 'paragraph',
          content: 'Hidden body',
          children: [],
        }];
      }

      if (markdown === 'im a blockquote') {
        return [{
          type: 'paragraph',
          content: 'im a blockquote',
          children: [],
        }];
      }

      if (markdown === 'Outer quote.') {
        return [{
          type: 'paragraph',
          content: 'Outer quote.',
          children: [],
        }];
      }

      if (markdown === 'Inner quote.') {
        return [{
          type: 'paragraph',
          content: 'Inner quote.',
          children: [],
        }];
      }

      if (markdown === 'Deeply nested quote.') {
        return [{
          type: 'paragraph',
          content: 'Deeply nested quote.',
          children: [],
        }];
      }

      if (markdown === 'Back to outer.') {
        return [{
          type: 'paragraph',
          content: 'Back to outer.',
          children: [],
        }];
      }

      if (markdown === 'First paragraph in the blockquote.') {
        return [{
          type: 'paragraph',
          content: 'First paragraph in the blockquote.',
          children: [],
        }];
      }

      if (markdown === 'Second paragraph in the blockquote.') {
        return [{
          type: 'paragraph',
          content: 'Second paragraph in the blockquote.',
          children: [],
        }];
      }

      if (markdown === 'First paragraph in the blockquote.\n\nSecond paragraph in the blockquote.') {
        return [{
          type: 'paragraph',
          content: 'First paragraph in the blockquote.',
          children: [],
        }, {
          type: 'paragraph',
          content: 'Second paragraph in the blockquote.',
          children: [],
        }];
      }

      if (markdown === '> im a blockquote') {
        return [{
          type: 'quote',
          content: [],
          children: [{
            type: 'paragraph',
            content: 'im a blockquote',
            children: [],
          }],
        }];
      }

      if (markdown === '## After') {
        return [{
          type: 'heading',
          props: { level: 2 },
          content: 'After',
          children: [],
        }];
      }

      return [];
    },
    async blocksToMarkdownLossy(blocks: Array<{ type: string; content?: unknown }>) {
      const [block] = blocks;
      if (!block) return '';

      if (block.type === 'paragraph') {
        if (typeof block.content === 'string') return block.content;
        if (Array.isArray(block.content)) {
          return block.content.map((item: any) => item?.text ?? '').join('');
        }
      }

      return '';
    },
    async blocksToHTMLLossy(blocks: Array<{ type: string; content?: unknown }>) {
      const [block] = blocks;
      if (!block) return '';

      if (block.type === 'paragraph') {
        if (typeof block.content === 'string') return `<p>${block.content}</p>`;
        if (Array.isArray(block.content)) {
          return `<p>${block.content.map((item: any) => item?.text ?? '').join('')}</p>`;
        }
      }

      return '<p></p>';
    },
  } as any;
}

test('importRichDocument isolates top-level blockquotes from following blocks', async () => {
  const editor = createFakeEditor();
  const blocks = await importRichDocument(editor, '> im a blockquote\n\n## After');

  assert.deepEqual(editor.calls, ['im a blockquote', '## After']);
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[0], {
    type: 'quote',
    content: 'im a blockquote',
    children: [],
  });
  assert.equal(blocks[1].type, 'heading');
});

test('exportRichDocument serializes a simple quote block as markdown', async () => {
  const editor = createFakeEditor();
  const markdown = await exportRichDocument(editor, [{
    type: 'quote',
    props: {},
    content: 'im a blockquote',
    children: [],
  }] as any);

  assert.equal(markdown, '> im a blockquote');
});

test('exportRichDocument serializes quote children within the same blockquote', async () => {
  const editor = createFakeEditor();
  const markdown = await exportRichDocument(editor, [{
    type: 'quote',
    props: {},
    content: 'first paragraph',
    children: [{
      type: 'paragraph',
      props: {},
      content: 'second paragraph',
      children: [],
    }],
  }] as any);

  assert.equal(markdown, '> first paragraph\n>\n> second paragraph');
});

test('importRichDocument preserves multi-paragraph blockquotes', async () => {
  const editor = createFakeEditor();
  const blocks = await importRichDocument(
    editor,
    '> First paragraph in the blockquote.\n>\n> Second paragraph in the blockquote.',
  );

  assert.deepEqual(editor.calls, [
    'First paragraph in the blockquote.\n\nSecond paragraph in the blockquote.',
  ]);
  assert.deepEqual(blocks, [{
    type: 'quote',
    content: 'First paragraph in the blockquote.',
    children: [{
      type: 'paragraph',
      content: 'Second paragraph in the blockquote.',
      children: [],
    }],
  }]);
});

test('importRichDocument preserves nested blockquotes', async () => {
  const editor = createFakeEditor();
  const blocks = await importRichDocument(
    editor,
    '> Outer quote.\n>\n> > Inner quote.\n> >\n> > > Deeply nested quote.\n>\n> Back to outer.',
  );

  assert.deepEqual(editor.calls, [
    'Outer quote.',
    'Inner quote.',
    'Deeply nested quote.',
    'Back to outer.',
  ]);
  assert.deepEqual(blocks, [{
    type: 'quote',
    content: 'Outer quote.',
    children: [{
      type: 'quote',
      content: 'Inner quote.',
      children: [{
        type: 'quote',
        content: 'Deeply nested quote.',
        children: [],
      }],
    }, {
      type: 'paragraph',
      content: 'Back to outer.',
      children: [],
    }],
  }]);
});

test('importRichDocument parses details blocks into details children', async () => {
  const editor = createFakeEditor();
  const blocks = await importRichDocument(
    editor,
    '<details>\n<summary>Summary</summary>\n\nHidden body\n</details>',
  );

  assert.equal(blocks.length, 1);
  assert.deepEqual(blocks[0], {
    type: 'details',
    props: { open: false },
    content: 'Summary',
    children: [{
      type: 'paragraph',
      content: 'Hidden body',
      children: [],
    }],
  });
});

test('exportRichDocument serializes details blocks with open state and children', async () => {
  const editor = createFakeEditor();
  const markdown = await exportRichDocument(editor, [{
    type: 'details',
    props: { open: true },
    content: 'Summary',
    children: [{
      type: 'paragraph',
      props: {},
      content: 'First line',
      children: [],
    }],
  }] as any);

  assert.equal(markdown, '<details open>\n<summary>Summary</summary>\n\nFirst line\n</details>');
});

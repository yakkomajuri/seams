import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleCodeFenceShortcut,
  type CodeFenceBlockLike,
  type CodeFenceEditorLike,
} from './codeFenceBehavior';

function createMockEditor(options: {
  currentBlock?: CodeFenceBlockLike;
  selectionEmpty?: boolean;
  parentOffset?: number;
  parentSize?: number;
  text?: string;
}) {
  const currentBlock = options.currentBlock ?? { id: 'block-1', type: 'paragraph' };
  const calls = {
    updates: [] as Array<{
      id: string;
      update: {
        type?: string;
        props?: Record<string, unknown>;
        content?: string | unknown[];
      };
    }>,
    setCursor: [] as Array<{ id: string; placement?: 'start' | 'end' }>,
  };

  const editor: CodeFenceEditorLike = {
    getTextCursorPosition() {
      return { block: currentBlock };
    },
    transact(fn) {
      return fn({
        selection: {
          empty: options.selectionEmpty ?? true,
          $anchor: {
            parentOffset: options.parentOffset ?? (options.text?.length ?? 0),
            parent: {
              content: { size: options.parentSize ?? (options.text?.length ?? 0) },
              textContent: options.text ?? '',
            },
          },
        },
      });
    },
    updateBlock(block, update) {
      calls.updates.push({
        id: typeof block === 'string' ? block : block.id,
        update,
      });
      return undefined;
    },
    setTextCursorPosition(block, placement) {
      calls.setCursor.push({
        id: typeof block === 'string' ? block : block.id,
        placement,
      });
      return undefined;
    },
  };

  return { editor, calls };
}

test('handleCodeFenceShortcut converts a fence with a language into an empty code block', () => {
  const { editor, calls } = createMockEditor({
    text: '```ts',
  });

  assert.equal(handleCodeFenceShortcut(editor), true);
  assert.deepEqual(calls.updates, [{
    id: 'block-1',
    update: {
      type: 'codeBlock',
      props: { language: 'typescript' },
      content: [],
    },
  }]);
  assert.deepEqual(calls.setCursor, [{ id: 'block-1', placement: 'start' }]);
});

test('handleCodeFenceShortcut converts a plain fence into an empty code block with the default language', () => {
  const { editor, calls } = createMockEditor({
    text: '```',
  });

  assert.equal(handleCodeFenceShortcut(editor), true);
  assert.deepEqual(calls.updates, [{
    id: 'block-1',
    update: {
      type: 'codeBlock',
      props: { language: 'text' },
      content: [],
    },
  }]);
  assert.deepEqual(calls.setCursor, [{ id: 'block-1', placement: 'start' }]);
});

test('handleCodeFenceShortcut is a no-op when the cursor is not at the end of the paragraph', () => {
  const { editor, calls } = createMockEditor({
    text: '```js',
    parentOffset: 2,
    parentSize: 5,
  });

  assert.equal(handleCodeFenceShortcut(editor), false);
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.setCursor.length, 0);
});

test('handleCodeFenceShortcut is a no-op outside paragraphs', () => {
  const { editor, calls } = createMockEditor({
    currentBlock: { id: 'block-1', type: 'heading' },
    text: '```js',
  });

  assert.equal(handleCodeFenceShortcut(editor), false);
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.setCursor.length, 0);
});

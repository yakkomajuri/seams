import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findParentDetailsBlock,
  handleDetailsBackspace,
  handleDetailsDelete,
  handleDetailsEnter,
  handleDetailsShiftEnter,
  type DetailsBlockLike,
  type DetailsEditorLike,
} from './detailsBehavior';

function createMockEditor(options: {
  currentBlock: DetailsBlockLike;
  selectionEmpty?: boolean;
  parentOffset?: number;
  parentSize?: number;
  parents?: Record<string, DetailsBlockLike | undefined>;
  prevBlocks?: Record<string, DetailsBlockLike | undefined>;
  updatedBlock?: DetailsBlockLike;
}) {
  const calls = {
    removed: [] as string[],
    setCursor: [] as Array<{ id: string; placement?: 'start' | 'end' }>,
    inserts: [] as Array<{
      blocks: Array<Record<string, unknown>>;
      referenceId: string;
      placement?: 'before' | 'after';
    }>,
    updates: [] as Array<{
      id: string;
      update: {
        type?: string;
        props?: Record<string, unknown>;
        children?: Array<Record<string, unknown>>;
      };
    }>,
    focused: 0,
    joinBackward: 0,
  };

  const parents = options.parents ?? {};
  const prevBlocks = options.prevBlocks ?? {};

  const editor: DetailsEditorLike = {
    getParentBlock(block) {
      const id = typeof block === 'string' ? block : block.id;
      return parents[id];
    },
    getPrevBlock(block) {
      const id = typeof block === 'string' ? block : block.id;
      return prevBlocks[id];
    },
    getTextCursorPosition() {
      return { block: options.currentBlock };
    },
    transact(fn) {
      return fn({
        selection: {
          empty: options.selectionEmpty ?? true,
          $anchor: {
            parentOffset: options.parentOffset ?? 0,
            parent: { content: { size: options.parentSize ?? 0 } },
          },
        },
      });
    },
    updateBlock(block, update) {
      const id = typeof block === 'string' ? block : block.id;
      calls.updates.push({ id, update });
      return options.updatedBlock ?? {
        ...options.currentBlock,
        props: { ...(options.currentBlock.props ?? {}), ...(update.props ?? {}) },
        children: (update.children as DetailsBlockLike[] | undefined) ?? options.currentBlock.children ?? [],
      };
    },
    insertBlocks(blocks, referenceBlock, placement) {
      const referenceId = typeof referenceBlock === 'string' ? referenceBlock : referenceBlock.id;
      calls.inserts.push({ blocks, referenceId, placement });
      return blocks.map((block, index) => ({
        id: `inserted-${index + 1}`,
        type: String(block.type ?? 'paragraph'),
        props: ('props' in block ? block.props : undefined) as Record<string, unknown> | undefined,
        children: [],
      }));
    },
    removeBlocks(blocks) {
      calls.removed.push(...blocks.map((block) => (typeof block === 'string' ? block : block.id)));
      return undefined;
    },
    setTextCursorPosition(block, placement) {
      calls.setCursor.push({
        id: typeof block === 'string' ? block : block.id,
        placement,
      });
      return undefined;
    },
    focus() {
      calls.focused += 1;
    },
    joinBackwardAtSelection() {
      calls.joinBackward += 1;
      return true;
    },
  };

  return { editor, calls };
}

test('findParentDetailsBlock finds the nearest details ancestor', () => {
  const details = { id: 'details-1', type: 'details', children: [] };
  const nested = { id: 'nested-1', type: 'paragraph', children: [] };
  const child = { id: 'child-1', type: 'paragraph', children: [] };
  const parent = findParentDetailsBlock({
    getParentBlock(block) {
      const id = typeof block === 'string' ? block : block.id;
      if (id === 'child-1') return nested;
      if (id === 'nested-1') return details;
      return undefined;
    },
  }, child);

  assert.equal(parent?.id, 'details-1');
});

test('handleDetailsEnter opens details, ensures a body block, and focuses it from summary end', () => {
  const details = { id: 'details-1', type: 'details', props: { open: false }, children: [] };
  const firstChild = { id: 'child-1', type: 'paragraph', children: [] };
  const { editor, calls } = createMockEditor({
    currentBlock: details,
    selectionEmpty: true,
    parentOffset: 7,
    parentSize: 7,
    updatedBlock: { ...details, props: { open: true }, children: [firstChild] },
  });

  assert.equal(handleDetailsEnter(editor), true);
  assert.deepEqual(calls.updates, [{
    id: 'details-1',
    update: {
      props: { open: true },
      children: [{ type: 'paragraph', content: '' }],
    },
  }]);
  assert.deepEqual(calls.setCursor, [{ id: 'child-1', placement: 'start' }]);
  assert.equal(calls.focused, 1);
});

test('handleDetailsEnter is a no-op inside the summary when not at the end', () => {
  const details = { id: 'details-1', type: 'details', props: { open: true }, children: [] };
  const { editor, calls } = createMockEditor({
    currentBlock: details,
    selectionEmpty: true,
    parentOffset: 3,
    parentSize: 7,
  });

  assert.equal(handleDetailsEnter(editor), true);
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.setCursor.length, 0);
});

test('handleDetailsEnter inserts a new paragraph for an empty direct body paragraph', () => {
  const details = { id: 'details-1', type: 'details', children: [] };
  const child = { id: 'child-1', type: 'paragraph', children: [] };
  const { editor, calls } = createMockEditor({
    currentBlock: child,
    selectionEmpty: true,
    parentOffset: 0,
    parentSize: 0,
    parents: { 'child-1': details },
  });

  assert.equal(handleDetailsEnter(editor), true);
  assert.deepEqual(calls.inserts, [{
    blocks: [{ type: 'paragraph', content: '' }],
    referenceId: 'child-1',
    placement: 'after',
  }]);
  assert.deepEqual(calls.setCursor, [{ id: 'inserted-1', placement: 'start' }]);
  assert.equal(calls.focused, 1);
  assert.deepEqual(calls.removed, []);
});

test('handleDetailsEnter lets empty list items use BlockNote exit-list behavior', () => {
  const details = { id: 'details-1', type: 'details', children: [] };
  const child = { id: 'child-1', type: 'bulletListItem', children: [] };
  const { editor, calls } = createMockEditor({
    currentBlock: child,
    selectionEmpty: true,
    parentOffset: 0,
    parentSize: 0,
    parents: { 'child-1': details },
  });

  assert.equal(handleDetailsEnter(editor), false);
  assert.equal(calls.inserts.length, 0);
  assert.equal(calls.setCursor.length, 0);
});

test('handleDetailsShiftEnter blocks hard breaks in the summary', () => {
  const details = { id: 'details-1', type: 'details', children: [] };
  const { editor } = createMockEditor({ currentBlock: details });

  assert.equal(handleDetailsShiftEnter(editor), true);
});

test('handleDetailsBackspace deletes the whole component when the summary is empty', () => {
  const details = { id: 'details-1', type: 'details', children: [] };
  const { editor, calls } = createMockEditor({
    currentBlock: details,
    selectionEmpty: true,
    parentOffset: 0,
    parentSize: 0,
  });

  assert.equal(handleDetailsBackspace(editor), true);
  assert.deepEqual(calls.removed, ['details-1']);
});

test('handleDetailsDelete blocks destructive edge behavior at the end of a non-empty summary', () => {
  const details = { id: 'details-1', type: 'details', children: [] };
  const { editor, calls } = createMockEditor({
    currentBlock: details,
    selectionEmpty: true,
    parentOffset: 5,
    parentSize: 5,
  });

  assert.equal(handleDetailsDelete(editor), true);
  assert.deepEqual(calls.removed, []);
});

test('handleDetailsBackspace blocks the first body paragraph from leaving details', () => {
  const details = { id: 'details-1', type: 'details', children: [] };
  const child = { id: 'child-1', type: 'paragraph', children: [] };
  const { editor, calls } = createMockEditor({
    currentBlock: child,
    selectionEmpty: true,
    parentOffset: 0,
    parentSize: 0,
    parents: { 'child-1': details },
  });

  assert.equal(handleDetailsBackspace(editor), true);
  assert.deepEqual(calls.setCursor, []);
  assert.equal(calls.focused, 0);
  assert.equal(calls.joinBackward, 0);
});

test('handleDetailsBackspace deletes an empty later body paragraph without leaving details', () => {
  const details = { id: 'details-1', type: 'details', children: [] };
  const firstChild = { id: 'child-1', type: 'paragraph', children: [] };
  const secondChild = { id: 'child-2', type: 'paragraph', children: [] };
  const { editor, calls } = createMockEditor({
    currentBlock: secondChild,
    selectionEmpty: true,
    parentOffset: 0,
    parentSize: 0,
    parents: { 'child-2': details },
    prevBlocks: { 'child-2': firstChild },
  });

  assert.equal(handleDetailsBackspace(editor), true);
  assert.deepEqual(calls.removed, ['child-2']);
  assert.deepEqual(calls.setCursor, [{ id: 'child-1', placement: 'end' }]);
  assert.equal(calls.focused, 1);
  assert.equal(calls.joinBackward, 0);
});

test('handleDetailsBackspace merges non-empty later body paragraphs without leaving details', () => {
  const details = { id: 'details-1', type: 'details', children: [] };
  const firstChild = { id: 'child-1', type: 'paragraph', children: [] };
  const secondChild = { id: 'child-2', type: 'paragraph', children: [] };
  const { editor, calls } = createMockEditor({
    currentBlock: secondChild,
    selectionEmpty: true,
    parentOffset: 0,
    parentSize: 4,
    parents: { 'child-2': details },
    prevBlocks: { 'child-2': firstChild },
  });

  assert.equal(handleDetailsBackspace(editor), true);
  assert.equal(calls.joinBackward, 1);
});

test('handleDetailsBackspace deletes an empty direct body list item without leaving details', () => {
  const details = { id: 'details-1', type: 'details', children: [] };
  const firstChild = { id: 'child-1', type: 'paragraph', children: [] };
  const child = { id: 'child-2', type: 'bulletListItem', children: [] };
  const { editor, calls } = createMockEditor({
    currentBlock: child,
    selectionEmpty: true,
    parentOffset: 0,
    parentSize: 0,
    parents: { 'child-2': details },
    prevBlocks: { 'child-2': firstChild },
  });

  assert.equal(handleDetailsBackspace(editor), true);
  assert.deepEqual(calls.removed, ['child-2']);
  assert.deepEqual(calls.setCursor, [{ id: 'child-1', placement: 'end' }]);
  assert.equal(calls.focused, 1);
});

test('handleDetailsBackspace converts non-empty direct body list items to paragraphs', () => {
  const details = { id: 'details-1', type: 'details', children: [] };
  const child = { id: 'child-1', type: 'bulletListItem', children: [] };
  const { editor, calls } = createMockEditor({
    currentBlock: child,
    selectionEmpty: true,
    parentOffset: 0,
    parentSize: 3,
    parents: { 'child-1': details },
  });

  assert.equal(handleDetailsBackspace(editor), true);
  assert.deepEqual(calls.updates, [{
    id: 'child-1',
    update: { type: 'paragraph', props: {} },
  }]);
  assert.equal(calls.joinBackward, 0);
});

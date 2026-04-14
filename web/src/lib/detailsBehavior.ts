type BlockIdentifierLike = string | { id: string } | DetailsBlockLike;

export interface DetailsBlockLike {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: DetailsBlockLike[];
}

interface SelectionSnapshot {
  selectionEmpty: boolean;
  parentOffset: number;
  parentSize: number;
}

export interface DetailsEditorLike {
  getParentBlock(block: BlockIdentifierLike): DetailsBlockLike | undefined;
  getPrevBlock(block: BlockIdentifierLike): DetailsBlockLike | undefined;
  getTextCursorPosition(): { block: DetailsBlockLike };
  transact<T>(fn: (tr: {
    selection: {
      empty: boolean;
      $anchor: {
        parentOffset: number;
        parent: { content: { size: number } };
      };
    };
  }) => T): T;
  updateBlock(
    block: BlockIdentifierLike,
    update: {
      type?: string;
      props?: Record<string, unknown>;
      children?: Array<Record<string, unknown>>;
    },
  ): DetailsBlockLike;
  insertBlocks(
    blocks: Array<Record<string, unknown>>,
    referenceBlock: BlockIdentifierLike,
    placement?: 'before' | 'after',
  ): DetailsBlockLike[];
  removeBlocks(blocks: BlockIdentifierLike[]): unknown;
  setTextCursorPosition(
    block: BlockIdentifierLike,
    placement?: 'start' | 'end',
  ): unknown;
  focus(): void;
  joinBackwardAtSelection?(): boolean;
}

export function isDetailsBlock(block: DetailsBlockLike | undefined): block is DetailsBlockLike {
  return block?.type === 'details';
}

export function findParentDetailsBlock(
  editor: Pick<DetailsEditorLike, 'getParentBlock'>,
  block: BlockIdentifierLike,
): DetailsBlockLike | undefined {
  let current = editor.getParentBlock(block);

  while (current) {
    if (isDetailsBlock(current)) {
      return current;
    }
    current = editor.getParentBlock(current);
  }

  return undefined;
}

function getSelectionSnapshot(editor: Pick<DetailsEditorLike, 'transact'>): SelectionSnapshot {
  return editor.transact((tr) => ({
    selectionEmpty: tr.selection.empty,
    parentOffset: tr.selection.$anchor.parentOffset,
    parentSize: tr.selection.$anchor.parent.content.size,
  }));
}

function ensureOpenDetailsWithBody(
  editor: Pick<DetailsEditorLike, 'updateBlock'>,
  block: DetailsBlockLike,
): DetailsBlockLike {
  const children = block.children ?? [];
  const isOpen = Boolean(block.props?.open);
  const needsBody = children.length === 0;

  if (!needsBody && isOpen) {
    return block;
  }

  return editor.updateBlock(block, {
    ...(isOpen ? {} : { props: { open: true } }),
    ...(needsBody ? { children: [{ type: 'paragraph', content: '' }] } : {}),
  });
}

export function handleDetailsEnter(editor: DetailsEditorLike): boolean {
  const currentBlock = editor.getTextCursorPosition().block;
  const currentBlockType = currentBlock.type;
  const selection = getSelectionSnapshot(editor);

  if (isDetailsBlock(currentBlock)) {
    if (!selection.selectionEmpty) {
      return true;
    }

    if (selection.parentOffset !== selection.parentSize) {
      return true;
    }

    const updatedBlock = ensureOpenDetailsWithBody(editor, currentBlock);
    const firstChild = updatedBlock.children?.[0];

    if (firstChild) {
      editor.setTextCursorPosition(firstChild, 'start');
      editor.focus();
    }

    return true;
  }

  const parentDetails = findParentDetailsBlock(editor, currentBlock);
  if (!parentDetails || !selection.selectionEmpty) {
    return false;
  }

  const directParent = editor.getParentBlock(currentBlock);
  if (directParent?.id !== parentDetails.id) {
    return false;
  }

  if (currentBlockType !== 'paragraph' || selection.parentSize !== 0) {
    return false;
  }

  // Prevent BlockNote's default "lift empty nested block" behavior from
  // removing empty direct body paragraphs out of a details block.
  const [newParagraph] = editor.insertBlocks(
    [{ type: 'paragraph', content: '' }],
    currentBlock,
    'after',
  );

  if (newParagraph) {
    editor.setTextCursorPosition(newParagraph, 'start');
    editor.focus();
  }

  return true;
}

export function handleDetailsShiftEnter(editor: DetailsEditorLike): boolean {
  return isDetailsBlock(editor.getTextCursorPosition().block);
}

export function handleDetailsBackspace(editor: DetailsEditorLike): boolean {
  const currentBlock = editor.getTextCursorPosition().block;
  const currentBlockType = currentBlock.type;
  const selection = getSelectionSnapshot(editor);

  if (isDetailsBlock(currentBlock)) {
    if (!selection.selectionEmpty) {
      return false;
    }

    if (selection.parentSize === 0) {
      editor.removeBlocks([currentBlock]);
      return true;
    }

    return selection.parentOffset === 0;
  }

  const parentDetails = findParentDetailsBlock(editor, currentBlock);
  if (!parentDetails || !selection.selectionEmpty || selection.parentOffset !== 0) {
    return false;
  }

  const directParent = editor.getParentBlock(currentBlock);
  if (directParent?.id !== parentDetails.id) {
    return false;
  }

  if (currentBlockType !== 'paragraph') {
    if (selection.parentSize === 0 && editor.getPrevBlock(currentBlock)) {
      const prevBlock = editor.getPrevBlock(currentBlock)!;
      editor.removeBlocks([currentBlock]);
      editor.setTextCursorPosition(prevBlock, 'end');
      editor.focus();
      return true;
    }

    editor.updateBlock(currentBlock, { type: 'paragraph', props: {} });
    return true;
  }

  const prevBlock = editor.getPrevBlock(currentBlock);
  if (!prevBlock) {
    return true;
  }

  if (selection.parentSize === 0) {
    editor.removeBlocks([currentBlock]);
    editor.setTextCursorPosition(prevBlock, 'end');
    editor.focus();
    return true;
  }

  editor.joinBackwardAtSelection?.() ?? (editor as any)._tiptapEditor?.commands?.joinBackward?.();
  return true;
}

export function handleDetailsDelete(editor: DetailsEditorLike): boolean {
  const currentBlock = editor.getTextCursorPosition().block;
  if (!isDetailsBlock(currentBlock)) {
    return false;
  }

  const selection = getSelectionSnapshot(editor);
  if (!selection.selectionEmpty) {
    return false;
  }

  if (selection.parentSize === 0) {
    editor.removeBlocks([currentBlock]);
    return true;
  }

  return selection.parentOffset === selection.parentSize;
}

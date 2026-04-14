import { resolveCodeLanguage } from './codeLanguages';

export interface CodeFenceBlockLike {
  id: string;
  type: string;
}

export interface CodeFenceEditorLike {
  getTextCursorPosition(): { block: CodeFenceBlockLike };
  transact<T>(fn: (tr: {
    selection: {
      empty: boolean;
      $anchor: {
        parentOffset: number;
        parent: {
          content: { size: number };
          textContent: string;
        };
      };
    };
  }) => T): T;
  updateBlock(
    block: CodeFenceBlockLike | string,
    update: {
      type?: string;
      props?: Record<string, unknown>;
      content?: string | unknown[];
    },
  ): unknown;
  setTextCursorPosition(block: CodeFenceBlockLike | string, placement?: 'start' | 'end'): unknown;
}

export function handleCodeFenceShortcut(editor: CodeFenceEditorLike): boolean {
  const { block } = editor.getTextCursorPosition();
  if (block.type !== 'paragraph') return false;

  const snapshot = editor.transact((tr) => ({
    empty: tr.selection.empty,
    offset: tr.selection.$anchor.parentOffset,
    size: tr.selection.$anchor.parent.content.size,
    text: tr.selection.$anchor.parent.textContent,
  }));

  if (!snapshot.empty || snapshot.offset !== snapshot.size) return false;

  const match = snapshot.text.match(/^```(.*)$/);
  if (!match) return false;

  const language = resolveCodeLanguage(match[1].trim());

  editor.updateBlock(block, {
    type: 'codeBlock',
    props: language ? { language } : undefined,
    content: [],
  });
  editor.setTextCursorPosition(block.id, 'start');

  return true;
}

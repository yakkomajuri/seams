import { useEffect, useState } from 'react';
import {
  BlockNoteSchema,
  createExtension,
  createCodeBlockSpec,
  defaultBlockSpecs,
  defaultProps,
  type Block,
  type BlockNoteEditor,
  type PartialBlock,
} from '@blocknote/core';
import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';
import {
  ToggleWrapper,
  createReactBlockSpec,
  type DefaultReactSuggestionItem,
} from '@blocknote/react';
import { useSettingsStore } from '../stores/settingsStore';
import MdxRawEditor from '../components/MdxRawEditor';
import { BLOCKNOTE_SUPPORTED_LANGUAGES, SHIKI_LANGUAGES } from './codeLanguages';
import { handleCodeFenceShortcut } from './codeFenceBehavior';
import {
  handleDetailsBackspace,
  handleDetailsDelete,
  handleDetailsEnter,
  handleDetailsShiftEnter,
} from './detailsBehavior';

export type SeamsSlashMenuItem = DefaultReactSuggestionItem & { key?: string };
const DEFAULT_CODE_THEME = 'github-dark-default';
const shikiHighlighterPromiseSymbol = Symbol.for('blocknote.shikiHighlighterPromise');
const shikiParserSymbol = Symbol.for('blocknote.shikiParser');

const detailsBlock = createReactBlockSpec({
  type: 'details' as const,
  propSchema: {
    ...defaultProps,
    open: { default: false },
  },
  content: 'inline',
  isFileBlock: false,
} as any, {
  meta: {
    hardBreakShortcut: 'none',
    isolating: false,
  },
  render: (({ block, editor, contentRef }: any) => {
    return (
      <ToggleWrapper
        block={block as any}
        editor={editor as any}
        toggledState={{
          get: (currentBlock) => Boolean((currentBlock as typeof block).props.open),
          set: (currentBlock, isToggled) => {
            editor.updateBlock(currentBlock as any, { props: { open: isToggled } });
          },
        }}
      >
        <p
          ref={(node) => {
            contentRef(node);
          }}
          className="seams-details-summary"
        />
      </ToggleWrapper>
    );
  }) as any,
}, [
  createExtension({
    key: 'code-fence-enter',
    keyboardShortcuts: {
      Enter: ({ editor }) => handleCodeFenceShortcut(editor as any),
      Space: ({ editor }) => handleCodeFenceShortcut(editor as any),
    },
  }),
  createExtension({
    key: 'details-keyboard-shortcuts',
    keyboardShortcuts: {
      Enter: ({ editor }) => handleDetailsEnter(editor as any),
      'Shift-Enter': ({ editor }) => handleDetailsShiftEnter(editor as any),
      Backspace: ({ editor }) => handleDetailsBackspace(editor as any),
      Delete: ({ editor }) => handleDetailsDelete(editor as any),
    },
  }),
]);

const mdxRawBlock = createReactBlockSpec({
  type: 'mdxRaw' as const,
  propSchema: {
    raw: { default: '' },
  },
  content: 'none',
  isFileBlock: false,
  isSelectable: false,
} as any, {
  render: (({ block, editor }: any) => {
    const [value, setValue] = useState<string>(block.props.raw);
    const theme = useSettingsStore((s) => s.settings?.theme ?? 'neutral-dark');
    const dark = theme !== 'neutral-light';

    useEffect(() => {
      setValue(block.props.raw);
    }, [block.props.raw]);

    return (
      <div className="seams-mdx-raw" contentEditable={false}>
        <div className="seams-mdx-raw-label">Raw MDX</div>
        <MdxRawEditor
          value={value}
          dark={dark}
          onChange={(next) => {
            setValue(next);
            editor.updateBlock(block, { props: { raw: next } });
          }}
        />
      </div>
    );
  }) as any,
});

export function bustShikiCache() {
  const shikiCache = globalThis as Record<symbol, unknown>;
  delete shikiCache[shikiHighlighterPromiseSymbol];
  delete shikiCache[shikiParserSymbol];
}

export function createSeamsEditorSchema(getCodeTheme: () => string = () => DEFAULT_CODE_THEME) {
  return BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      codeBlock: createCodeBlockSpec({
        defaultLanguage: 'text',
        supportedLanguages: BLOCKNOTE_SUPPORTED_LANGUAGES,
        createHighlighter: () =>
          import('shiki').then(({ createHighlighter }) =>
            createHighlighter({
              themes: [getCodeTheme()],
              langs: SHIKI_LANGUAGES,
            }),
          ),
      }),
      details: detailsBlock(),
      mdxRaw: mdxRawBlock(),
    },
  });
}

export const seamsEditorSchema = createSeamsEditorSchema();

export type SeamsBlockSchema = typeof seamsEditorSchema.blockSchema;
export type SeamsInlineContentSchema = typeof seamsEditorSchema.inlineContentSchema;
export type SeamsStyleSchema = typeof seamsEditorSchema.styleSchema;
export type SeamsEditor = BlockNoteEditor<SeamsBlockSchema, SeamsInlineContentSchema, SeamsStyleSchema>;
export type SeamsBlock = Block<SeamsBlockSchema, SeamsInlineContentSchema, SeamsStyleSchema>;
export type SeamsPartialBlock = PartialBlock<SeamsBlockSchema, SeamsInlineContentSchema, SeamsStyleSchema>;

interface GetSeamsSlashMenuItemsOptions {
  allowMdxBlocks?: boolean;
}

export function getSeamsSlashMenuItems(
  editor: SeamsEditor,
  options: GetSeamsSlashMenuItemsOptions = {},
): SeamsSlashMenuItem[] {
  const items: SeamsSlashMenuItem[] = [{
    key: 'details',
    title: 'Details',
    subtext: 'Collapsible block with a summary',
    aliases: ['accordion', 'disclosure', 'summary'],
    group: 'Basic blocks',
    onItemClick: () => {
      insertOrUpdateBlockForSlashMenu(editor, {
        type: 'details',
        props: { open: true },
        content: '',
        children: [{ type: 'paragraph', content: '' }],
      } as SeamsPartialBlock);
    },
    icon: (
      <svg viewBox="0 0 16 16" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
        <path d="M3 5.5h10M3 10.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M10.5 3.5l3 2.5-3 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  }];

  if (options.allowMdxBlocks) {
    items.push({
      key: 'mdxRaw',
      title: 'MDX Block',
      subtext: 'Insert raw JSX, imports, or expressions',
      aliases: ['mdx', 'jsx', 'component', 'import', 'export', 'raw'],
      group: 'Advanced blocks',
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'mdxRaw',
          props: { raw: '<Component />' },
          children: [],
        } as SeamsPartialBlock);
      },
      icon: (
        <svg viewBox="0 0 16 16" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
          <path d="M2.75 4.25h3.5M2.75 8h3.5M2.75 11.75h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M9.5 4.25l3.75 3.75L9.5 11.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    });
  }

  return items;
}

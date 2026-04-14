import { useEffect, useRef } from 'react';
import { Decoration, EditorView, ViewPlugin, keymap } from '@codemirror/view';
import { EditorState, type Range } from '@codemirror/state';
import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { classHighlighter } from '@lezer/highlight';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';

const inlineCodeMark = Decoration.mark({ class: 'cm-inline-code' });

const inlineCodeHighlight = ViewPlugin.fromClass(class {
  decorations;
  constructor(view: EditorView) { this.decorations = this.build(view); }
  update(update: { docChanged: boolean; viewportChanged: boolean; view: EditorView }) {
    if (update.docChanged || update.viewportChanged) this.decorations = this.build(update.view);
  }
  build(view: EditorView) {
    const decos: Range<Decoration>[] = [];
    syntaxTree(view.state).iterate({
      enter(node) {
        if (node.name === 'InlineCode') {
          decos.push(inlineCodeMark.range(node.from, node.to));
        }
      },
    });
    return Decoration.set(decos);
  }
}, { decorations: (v) => v.decorations });

function buildTheme(dark: boolean) {
  return EditorView.theme({
    '&': {
      background: 'transparent',
      color: 'var(--txt-3)',
      fontSize: '18px',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
      overflow: 'visible',
      fontFamily: 'inherit',
      lineHeight: '1.5',
    },
    '.cm-content': {
      padding: '0',
      caretColor: 'var(--accent)',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--accent)',
    },
    '.cm-selectionBackground': {
      background: 'var(--accent-soft) !important',
    },
    '&.cm-focused .cm-selectionBackground': {
      background: 'var(--accent-soft) !important',
    },
    '.cm-activeLine': { background: 'transparent' },
    '.cm-gutters': { display: 'none' },
    '.cm-line': { padding: '0' },
    '.cm-inline-code': {
      background: 'var(--surface-3)',
      borderRadius: '3px',
      padding: '0.1em 0',
    },
  }, { dark });
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  dark: boolean;
}

export default function MarkdownCodeEditor({ value, onChange, dark }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Create editor once
  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          syntaxHighlighting(classHighlighter),
          buildTheme(dark),
          inlineCodeHighlight,
          EditorView.contentAttributes.of({ spellcheck: 'false' }),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (file switch)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  // Rebuild theme when dark/light changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: [] }); // force re-render; theme uses CSS vars so it adapts automatically
  }, [dark]);

  return <div ref={containerRef} className="w-full" />;
}

import { useEffect, useRef } from 'react';
import { Decoration, EditorView, ViewPlugin, keymap } from '@codemirror/view';
import { EditorState, type Range } from '@codemirror/state';
import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { classHighlighter } from '@lezer/highlight';
import { html } from '@codemirror/lang-html';

// Highlight HTML attribute values with inline-code appearance
const stringMark = Decoration.mark({ class: 'tok-attributeValue' });
const stringHighlight = ViewPlugin.fromClass(class {
  decorations;
  constructor(view: EditorView) { this.decorations = this.build(view); }
  update(update: { docChanged: boolean; viewportChanged: boolean; view: EditorView }) {
    if (update.docChanged || update.viewportChanged) this.decorations = this.build(update.view);
  }
  build(view: EditorView) {
    const decos: Range<Decoration>[] = [];
    syntaxTree(view.state).iterate({
      enter(node) {
        if (node.name === 'AttributeValue') {
          decos.push(stringMark.range(node.from, node.to));
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
      padding: '0.95rem 1rem 1rem',
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
  }, { dark });
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  dark: boolean;
}

export default function MdxRawEditor({ value, onChange, dark }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          html({ matchClosingTags: true, autoCloseTags: true }),
          syntaxHighlighting(classHighlighter),
          buildTheme(dark),
          stringHighlight,
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

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: [] });
  }, [dark]);

  return <div ref={containerRef} className="w-full" />;
}

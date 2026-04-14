import { useRef, useEffect } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting } from '@codemirror/language';
import { classHighlighter } from '@lezer/highlight';
import { json } from '@codemirror/lang-json';

function buildTheme(dark: boolean) {
  return EditorView.theme(
    {
      '&': {
        background: 'transparent',
        color: 'var(--txt)',
        fontSize: '18px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      },
      '&.cm-focused': { outline: 'none' },
      '.cm-scroller': {
        fontFamily: 'inherit',
        lineHeight: '1.5',
        overflow: 'auto',
      },
      '.cm-content': {
        padding: '12px 16px',
        caretColor: 'var(--accent)',
        minHeight: '400px',
      },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)' },
      '.cm-selectionBackground': { background: 'var(--accent-soft) !important' },
      '&.cm-focused .cm-selectionBackground': { background: 'var(--accent-soft) !important' },
      '.cm-activeLine': { background: 'transparent' },
      '.cm-gutters': { display: 'none' },
      '.cm-line': { padding: '0' },
    },
    { dark },
  );
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSave?: () => void;
  dark: boolean;
}

export default function JsonCodeEditor({ value, onChange, onSave, dark }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  onChangeRef.current = onChange;
  onSaveRef.current = onSave;

  const themeCompartment = useRef(new Compartment());

  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab,
            {
              key: 'Mod-s',
              run: () => {
                onSaveRef.current?.();
                return true;
              },
            },
          ]),
          json(),
          syntaxHighlighting(classHighlighter),
          themeCompartment.current.of(buildTheme(dark)),
          EditorView.contentAttributes.of({ spellcheck: 'false' }),
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
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. Reload)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  // Rebuild theme on dark/light toggle
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.current.reconfigure(buildTheme(dark)),
    });
  }, [dark]);

  return <div ref={containerRef} className="w-full" style={{ background: 'var(--surface-2)' }} />;
}

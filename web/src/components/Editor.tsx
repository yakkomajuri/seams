import { useEffect, useMemo, useRef, useState } from 'react';
import { BlockNoteView } from '@blocknote/mantine';
import {
  AddBlockButton,
  DragHandleButton,
  DragHandleMenu,
  RemoveBlockItem,
  SideMenu,
  SideMenuController,
  SuggestionMenuController,
  LinkToolbarController,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  type SideMenuProps,
  useDictionary,
  useBlockNoteEditor,
  useCreateBlockNote,
  useExtensionState,
} from '@blocknote/react';
import {
  filterSuggestionItems,
  type DefaultSuggestionItem,
} from '@blocknote/core';
import { SideMenuExtension } from '@blocknote/core/extensions';
import { useFileStore } from '../stores/fileStore';
import { useUiStore } from '../stores/uiStore';
import { useSettingsStore } from '../stores/settingsStore';
import { goToFiles } from '../lib/router';
import { buildPageUrl, collectFiles } from '../lib/pageLinkItems';
import { useAutoSave } from '../hooks/useAutoSave';
import { api } from '../lib/api';
import { findParentDetailsBlock } from '../lib/detailsBehavior';
import { bustShikiCache, createSeamsEditorSchema, getSeamsSlashMenuItems, type SeamsEditor, type SeamsSlashMenuItem } from '../lib/editorSchema';
import { collapseListGaps, exportRichDocument, importRichDocument, isMdxFile } from '../lib/richDocument';
import { getPageLinkItems } from '../lib/pageLinkItems';
import { SeamsLinkToolbar, SeamsFormattingToolbar } from './SeamsLinkMenu';
import FrontmatterForm from './FrontmatterForm';
import MarkdownCodeEditor from './MarkdownCodeEditor';

type ViewMode = 'editor' | 'raw';
type SaveState = 'saved' | 'saving' | 'error';
type SlashMenuItem = SeamsSlashMenuItem;

function countWords(text: string): number {
  let s = text;
  s = s.replace(/```[\s\S]*?```/g, '');
  s = s.replace(/`[^`]*`/g, '');
  s = s.replace(/!\[.*?\]\(.*?\)/g, '');
  s = s.replace(/\[([^\]]*)\]\(.*?\)/g, '$1');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/[*_]{1,3}/g, '');
  s = s.replace(/^\s*>\s?/gm, '');
  s = s.replace(/^[-*_]{3,}\s*$/gm, '');
  s = s.replace(/^\s*[-*+]\s+/gm, '');
  s = s.replace(/^\s*\d+\.\s+/gm, '');
  return s.split(/\s+/).filter(w => w.length > 0).length;
}

const HIDDEN_SLASH_MENU_KEYS = new Set([
  'video',
  'audio',
  'file',
  'toggle_list',
  'toggle_heading',
  'toggle_heading_2',
  'toggle_heading_3',
]);

function SafeDragHandleMenu() {
  const dict = useDictionary();

  return (
    <DragHandleMenu>
      <RemoveBlockItem>{dict.drag_handle.delete_menuitem}</RemoveBlockItem>
    </DragHandleMenu>
  );
}

function SafeSideMenu(props: SideMenuProps) {
  const editor = useBlockNoteEditor<any, any, any>();
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  });

  if (block && findParentDetailsBlock(editor as any, block as any)) {
    return null;
  }

  return (
    <SideMenu {...props}>
      <AddBlockButton />
      <DragHandleButton dragHandleMenu={SafeDragHandleMenu} />
    </SideMenu>
  );
}

function EmptyState({ recentFiles }: { recentFiles: string[] }) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  useEffect(() => {
    if (recentFiles.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => (i + 1) % recentFiles.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => (i <= 0 ? recentFiles.length - 1 : i - 1));
      } else if (e.key === 'Enter') {
        setFocusedIndex((i) => {
          if (i >= 0 && i < recentFiles.length) goToFiles(recentFiles[i]);
          return i;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recentFiles]);

  return (
    <div className="grid h-full place-items-center" style={{ alignContent: 'center', paddingBottom: '10%' }}>
      <div className="text-center">
        {recentFiles.length > 0 ? (
          <div>
            <p className="mb-3 text-sm font-medium" style={{ color: 'var(--txt-4)' }}>
              Recent files
              <span className="ml-2 text-xs" style={{ color: 'var(--txt-4)', opacity: 0.6 }}>↑↓</span>
            </p>
            <ul className="space-y-1">
              {recentFiles.map((filePath, idx) => (
                <li key={filePath}>
                  <button
                    className="w-full rounded px-4 py-2 text-left text-sm transition-colors"
                    style={{
                      color: focusedIndex === idx ? 'var(--txt)' : 'var(--txt-3)',
                      background: focusedIndex === idx ? 'var(--surface-2)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      setFocusedIndex(idx);
                      e.currentTarget.style.background = 'var(--surface-2)';
                      e.currentTarget.style.color = 'var(--txt)';
                    }}
                    onMouseLeave={(e) => {
                      setFocusedIndex(-1);
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--txt-3)';
                    }}
                    onClick={() => goToFiles(filePath)}
                  >
                    {filePath.replace(/^\.\//, '')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--txt-4)' }}>Select a file from the sidebar to start editing</p>
        )}
      </div>
    </div>
  );
}

export default function Editor() {
  const { activeFile, loadingFile, markdown, frontmatter, saveFile, files } = useFileStore();
  const recentFiles = useUiStore((s) => s.recentFiles);
  const settings = useSettingsStore((s) => s.settings);
  const theme = useSettingsStore((s) => s.settings?.theme ?? 'neutral-dark');
  const linkRoot = settings?.linkRoot ?? '';

  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [rawValue, setRawValue] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [localTitle, setLocalTitle] = useState('');
  const titleFocusedRef = useRef(false);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const wordCountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLightTheme = theme === 'neutral-light';
  const codeTheme = isLightTheme ? 'github-light-default' : 'github-dark-default';
  const codeThemeRef = useRef(codeTheme);
  codeThemeRef.current = codeTheme;

  const editorOptions = useMemo(() => ({
    schema: createSeamsEditorSchema(() => codeThemeRef.current),
    uploadFile: api.uploadFile,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []); // stable — editor is never recreated on theme change
  const editor = useCreateBlockNote(editorOptions as any) as unknown as SeamsEditor;

  // When codeTheme changes, bust the Shiki cache so the next code-block render
  // picks up the new theme (BlockNoteView already re-renders due to theme prop change).
  const prevCodeThemeRef = useRef(codeTheme);
  useEffect(() => {
    if (prevCodeThemeRef.current === codeTheme) return;
    prevCodeThemeRef.current = codeTheme;
    bustShikiCache();
  }, [codeTheme]);
  const getSlashMenuItems = useMemo(() => {
    const items = [
      ...getDefaultReactSlashMenuItems(editor).filter(
        (item) => !HIDDEN_SLASH_MENU_KEYS.has((item as SlashMenuItem).key ?? ''),
      ),
      ...getSeamsSlashMenuItems(editor, { allowMdxBlocks: isMdxFile(activeFile) }),
    ];

    return async (query: string) => filterSuggestionItems(items, query);
  }, [activeFile, editor]);

  const getPageLinkMenuItems = useMemo(() => {
    const items = getPageLinkItems(editor, files, linkRoot, activeFile);
    return async (query: string) => filterSuggestionItems(items as DefaultSuggestionItem[], query);
  }, [files, linkRoot, activeFile, editor]);

  const activeFileRef = useRef(activeFile);
  activeFileRef.current = activeFile;

  const frontmatterRef = useRef(frontmatter);
  frontmatterRef.current = frontmatter;

  const rawValueRef = useRef(rawValue);
  rawValueRef.current = rawValue;

  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const richBaselineBodyRef = useRef(markdown);

  const suppressEditorChangeRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset to editor view when file changes
  useEffect(() => {
    setViewMode('editor');
    setRawValue('');
    setIsDirty(false);
    setSaveState('saved');
    setSaveError(null);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (wordCountTimerRef.current) {
      clearTimeout(wordCountTimerRef.current);
      wordCountTimerRef.current = null;
    }
  }, [activeFile]);

  // Sync localTitle from frontmatter.title when not editing the h1
  useEffect(() => {
    if (!titleFocusedRef.current) {
      setLocalTitle('title' in frontmatter ? String(frontmatter['title'] ?? '') : '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, frontmatter['title']]);

  // Keep h1 DOM content in sync with localTitle when h1 is not focused
  useEffect(() => {
    const el = h1Ref.current;
    if (!el || titleFocusedRef.current) return;
    if (el.textContent !== localTitle) el.textContent = localTitle;
  }, [localTitle]);

  useEffect(() => {
    let mounted = true;
    suppressEditorChangeRef.current = true;
    richBaselineBodyRef.current = markdown;

    importRichDocument(editor, markdown, activeFile).then(async (blocks) => {
      if (!mounted) return;
      editor.replaceBlocks(editor.document, blocks as any);
      richBaselineBodyRef.current = collapseListGaps(await exportRichDocument(editor, editor.document));
      suppressEditorChangeRef.current = false;
    }).catch(() => {
      if (!mounted) return;
      setRawValue(markdown);
      setViewMode('raw');
      setSaveState('error');
      setSaveError('Could not parse this document in Rich mode');
      suppressEditorChangeRef.current = false;
    });

    return () => {
      mounted = false;
      suppressEditorChangeRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, editor]); // markdown intentionally omitted — only reload on file change, not on save

  const debounceDelay = settings?.autoSaveDelay ?? 1000;
  const autoSaveEnabled = settings?.autoSave ?? true;
  const autoSaveEnabledRef = useRef(autoSaveEnabled);
  autoSaveEnabledRef.current = autoSaveEnabled;
  const debounceDelayRef = useRef(debounceDelay);
  debounceDelayRef.current = debounceDelay;

  function clearPendingSave() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }

  async function getCurrentBody(mode = viewModeRef.current): Promise<string> {
    if (mode === 'raw') return rawValueRef.current;
    return collapseListGaps(await exportRichDocument(editor, editor.document));
  }

  const performSaveRef = useRef<(options?: {
    body?: string;
    frontmatter?: Record<string, unknown>;
  }) => Promise<void>>(async () => {});

  performSaveRef.current = async (options) => {
    const path = activeFileRef.current;
    if (!path) return;

    const nextFrontmatter = options?.frontmatter ?? frontmatterRef.current;
    const body = options?.body ?? await getCurrentBody();

    setSaveState('saving');
    setSaveError(null);

    try {
      await saveFile(path, body, nextFrontmatter);
      if (activeFileRef.current === path) {
        if (viewModeRef.current === 'editor') {
          richBaselineBodyRef.current = body;
        }
        setIsDirty(false);
        setSaveState('saved');
      }
    } catch (error) {
      if (activeFileRef.current === path) {
        setSaveState('error');
        setSaveError(error instanceof Error ? error.message : 'Save failed');
      }
    }
  };

  const editorSaveCallbackRef = useRef(() => {});
  editorSaveCallbackRef.current = () => {
    if (suppressEditorChangeRef.current || viewModeRef.current !== 'editor') return;

    void (async () => {
      const body = collapseListGaps(await exportRichDocument(editor, editor.document));
      if (body === richBaselineBodyRef.current) {
        setIsDirty(false);
        return;
      }

      setIsDirty(true);
      if (!activeFileRef.current || !autoSaveEnabledRef.current) return;
      clearPendingSave();
      saveTimerRef.current = setTimeout(() => {
        void performSaveRef.current({ body });
      }, debounceDelayRef.current);
    })();
  };

  useEffect(() => {
    clearPendingSave();
  }, [activeFile, autoSaveEnabled, debounceDelay, viewMode]);

  useAutoSave(
    () => {
      if (!activeFile || !autoSaveEnabled || viewMode !== 'raw' || !isDirty) return;
      void performSaveRef.current({ body: rawValue });
    },
    [rawValue, activeFile, autoSaveEnabled, viewMode, isDirty],
    debounceDelay,
  );

  // Initialize word count on file load
  useEffect(() => {
    setWordCount(countWords(markdown));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

  // Debounced word count update for raw mode
  useEffect(() => {
    if (viewMode !== 'raw') return;
    if (wordCountTimerRef.current) clearTimeout(wordCountTimerRef.current);
    wordCountTimerRef.current = setTimeout(() => {
      setWordCount(countWords(rawValue));
    }, 300);
  }, [rawValue, viewMode]);

  // Debounced word count update for editor mode
  const wordCountCallbackRef = useRef(() => {});
  wordCountCallbackRef.current = () => {
    if (suppressEditorChangeRef.current || viewModeRef.current !== 'editor') return;
    if (wordCountTimerRef.current) clearTimeout(wordCountTimerRef.current);
    wordCountTimerRef.current = setTimeout(async () => {
      const md = await exportRichDocument(editor, editor.document);
      setWordCount(countWords(md));
    }, 300);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      clearPendingSave();
      void performSaveRef.current();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function switchToRaw() {
    clearPendingSave();
    const body = collapseListGaps(await exportRichDocument(editor, editor.document));
    setRawValue(body);
    setViewMode('raw');
  }

  async function switchToEditor() {
    clearPendingSave();
    suppressEditorChangeRef.current = true;
    const body = rawValueRef.current;
    const blocks = await importRichDocument(editor, body, activeFileRef.current);
    try {
      editor.replaceBlocks(editor.document, blocks as any);
      richBaselineBodyRef.current = body;
    } finally {
      suppressEditorChangeRef.current = false;
    }
    await performSaveRef.current({ body });
    setViewMode('editor');
  }

  function handleFrontmatterChange(fm: Record<string, unknown>) {
    clearPendingSave();
    void performSaveRef.current({ frontmatter: fm });
  }

  function handleRawChange(next: string) {
    setRawValue(next);
    setIsDirty(true);
  }

  const showEditor = !!activeFile && !(loadingFile && loadingFile !== activeFile);

  // Breadcrumb parts
  const crumbs = activeFile ? activeFile.replace(/^\.\//, '').split('/') : [];
  const saveStatus = saveState === 'saving'
    ? 'Saving...'
    : saveState === 'error'
      ? 'Save failed'
      : isDirty
        ? 'Unsaved'
        : 'Saved';

  return (
    <div className="relative h-full">
      {/* Loading overlay — covers editor while new file is loading */}
      {loadingFile && loadingFile !== activeFile && (
        <div className="absolute inset-0 z-20 grid h-full place-items-center" style={{ background: 'var(--canvas)' }}>
          <div className="text-center">
            <p className="text-sm" style={{ color: 'var(--txt-3)' }}>Opening file…</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--txt-4)' }}>{loadingFile}</p>
          </div>
        </div>
      )}

      {/* Empty state overlay — covers editor when no file is active */}
      {!activeFile && !loadingFile && (
        <div className="absolute inset-0 z-20" style={{ background: 'var(--canvas)' }}>
          <EmptyState recentFiles={recentFiles} />
        </div>
      )}

      {/* Sticky top bar — hidden (not unmounted) when editor is not active */}
      <div
        className={`sticky top-0 z-10 flex items-center justify-between px-8 ${showEditor ? '' : 'hidden'}`}
        style={{ background: 'var(--canvas)', borderBottom: '1px solid var(--bd)', height: '52px' }}
      >
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--txt-4)' }}>
          {crumbs.map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && (
                <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 6 10" fill="none">
                  <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
              <span style={{ color: i === crumbs.length - 1 ? 'var(--txt-3)' : 'var(--txt-4)' }}>{part}</span>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--txt-4)' }}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'} · {Math.ceil(wordCount / 200)} min read
          </span>

          <span
            className="text-xs"
            style={{ color: saveState === 'error' ? 'var(--danger, #ef4444)' : 'var(--txt-4)' }}
            title={saveError ?? undefined}
          >
            {saveStatus}
          </span>

          <button
            className="rounded-md p-1.5 transition-colors"
            style={{
              background: 'transparent',
              border: 'none',
              color: isDirty ? 'var(--accent)' : 'var(--txt-4)',
            }}
            onClick={() => {
              clearPendingSave();
              void performSaveRef.current();
            }}
            aria-label="Save file"
            title={isDirty ? 'Save file (Cmd/Ctrl+S)' : 'Save file'}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 2.5h8l2.5 2.5v8.5H2.5v-11A1 1 0 0 1 3.5 1.5Z"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinejoin="round"
              />
              <path
                d="M5 2.5v3h5v-3M5.25 13V9.5h5.5V13"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div
            className="flex items-center rounded-md p-0.5"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--bd)' }}
          >
            {(['editor', 'raw'] as ViewMode[]).map((mode) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  className="rounded px-2 py-0.5 text-[11px] font-medium capitalize transition-colors"
                  style={{
                    background: active ? 'var(--surface-3)' : 'transparent',
                    color: active ? 'var(--txt)' : 'var(--txt-4)',
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--txt-3)'; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--txt-4)'; }}
                  onClick={() => { void (mode === 'raw' ? switchToRaw() : switchToEditor()); }}
                >
                  {mode === 'editor' ? 'Rich' : 'Raw'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className={`mx-auto w-full max-w-4xl px-8 pt-10 pb-32 ${showEditor ? '' : 'hidden'}`}>
        {'title' in frontmatter && (
          <h1
            ref={h1Ref}
            contentEditable
            suppressContentEditableWarning
            className="title-editable mb-4 w-full outline-none"
            style={{
              color: 'var(--txt)',
              fontSize: '40px',
              fontWeight: 700,
              lineHeight: '46px',
              cursor: 'text',
            }}
            data-placeholder="Untitled"
            onFocus={() => { titleFocusedRef.current = true; }}
            onInput={(e) => {
              const value = e.currentTarget.textContent ?? '';
              setLocalTitle(value);
            }}
            onBlur={(e) => {
              titleFocusedRef.current = false;
              handleFrontmatterChange({ ...frontmatter, title: e.currentTarget.textContent ?? '' });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLHeadingElement).blur();
              }
              if (e.key === 'Escape') {
                const saved = String(frontmatter['title'] ?? '');
                e.currentTarget.textContent = saved;
                setLocalTitle(saved);
                titleFocusedRef.current = false;
                (e.target as HTMLHeadingElement).blur();
              }
            }}
          />
        )}
        <FrontmatterForm
          frontmatter={frontmatter}
          onChange={handleFrontmatterChange}
          titleLiveValue={'title' in frontmatter ? localTitle : undefined}
          onTitleLiveChange={(v) => {
            setLocalTitle(v);
          }}
        />

        {viewMode === 'raw' && (
          <div className="mt-4">
            <MarkdownCodeEditor value={rawValue} onChange={handleRawChange} dark={!isLightTheme} />
          </div>
        )}
        {/* Always mounted so TipTap's view is never destroyed mid-flight */}
        <div
          className={viewMode === 'raw' ? 'hidden' : ''}
          onClickCapture={(e) => {
            const anchor = (e.target as Element).closest('a');
            if (!anchor) return;
            // Only follow links when Cmd (Mac) or Ctrl (Windows/Linux) is held
            if (!e.metaKey && !e.ctrlKey) return;
            // Get the raw href attribute (not the browser-resolved absolute URL)
            const href = anchor.getAttribute('href');
            if (!href) return;
            // External links: open in new tab
            if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
              e.preventDefault();
              window.open(href, '_blank', 'noopener,noreferrer');
              return;
            }
            // Internal link: find matching file and navigate in-app
            // Support both new-style (/page.md) and old-style (/page) URLs
            const match = collectFiles(files).find((f) => {
              if (buildPageUrl(f.path, linkRoot) === href) return true;
              const noExt = f.path.replace(/\.(md|mdx|txt)$/, '');
              return buildPageUrl(noExt, linkRoot) === href;
            });
            if (match) {
              e.preventDefault();
              e.stopPropagation();
              goToFiles(match.path);
            }
          }}
        >
          <BlockNoteView
            editor={editor}
            theme={isLightTheme ? 'light' : 'dark'}
            slashMenu={false}
            sideMenu={false}
            linkToolbar={false}
            formattingToolbar={false}
            spellCheck={false}
            onChange={() => { editorSaveCallbackRef.current(); wordCountCallbackRef.current(); }}
          >
            <SideMenuController sideMenu={SafeSideMenu} />
            <SuggestionMenuController triggerCharacter="/" getItems={getSlashMenuItems} />
            <SuggestionMenuController triggerCharacter="[[" getItems={getPageLinkMenuItems} />
            <LinkToolbarController linkToolbar={SeamsLinkToolbar} />
            <FormattingToolbarController formattingToolbar={SeamsFormattingToolbar} />
          </BlockNoteView>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, type DragEvent as ReactDragEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { useFileStore } from '../stores/fileStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useUiStore } from '../stores/uiStore';
import { goToFiles, goToSettings } from '../lib/router';
import { DRAG_MIME, baseName, hasSeamsDrag, parentDir } from '../lib/drag';
import FileTree from './FileTree';
import CreateFileDialog from './CreateFileDialog';
import CreateDirectoryDialog from './CreateDirectoryDialog';

interface Props {
  settingsOpen: boolean;
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ settingsOpen, collapsed, onToggle }: Props) {
  const { files, activeFile, loadingFile, closeFile, deleteFile, renameFile } = useFileStore();
  const setShowSearch = useUiStore((s) => s.setShowSearch);
  const rootDir = useSettingsStore((s) => s.rootDir);
  const rootDirName = useSettingsStore((s) => s.rootDirName) ?? (rootDir ? rootDir.split('/').filter(Boolean).pop() ?? rootDir : 'seams');
  const activeTreePath = settingsOpen ? undefined : (loadingFile ?? activeFile);
  const settingsIconColor = settingsOpen ? 'var(--txt-2)' : 'var(--txt-4)';
  const [rootMenuPoint, setRootMenuPoint] = useState<{ x: number; y: number } | null>(null);
  const [newRootFileOpen, setNewRootFileOpen] = useState(false);
  const [newRootDirOpen, setNewRootDirOpen] = useState(false);
  const [pendingFileInDir, setPendingFileInDir] = useState<string | undefined>(undefined);
  const rootMenuRef = useRef<HTMLDivElement>(null);
  const [rootDragOver, setRootDragOver] = useState(false);

  function handleRootDragOver(event: ReactDragEvent<HTMLDivElement>) {
    if (!hasSeamsDrag(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const target = event.target as HTMLElement | null;
    const overDir = Boolean(target && target.closest('[data-file-tree-dir]'));
    if (overDir) {
      if (rootDragOver) setRootDragOver(false);
    } else if (!rootDragOver) {
      setRootDragOver(true);
    }
  }

  function handleRootDragLeave(event: ReactDragEvent<HTMLDivElement>) {
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
    setRootDragOver(false);
  }

  function handleRootDrop(event: ReactDragEvent<HTMLDivElement>) {
    if (!hasSeamsDrag(event.dataTransfer)) return;
    event.preventDefault();
    setRootDragOver(false);
    const source = event.dataTransfer.getData(DRAG_MIME);
    if (!source) return;
    if (parentDir(source) === '') return;
    const target = baseName(source);
    if (source === target) return;
    renameFile(source, target).then(() => {
      if (activeFile === source) goToFiles(target);
    });
  }

  useEffect(() => {
    if (!rootDragOver) return;
    const clear = () => setRootDragOver(false);
    window.addEventListener('dragend', clear);
    window.addEventListener('drop', clear);
    return () => {
      window.removeEventListener('dragend', clear);
      window.removeEventListener('drop', clear);
    };
  }, [rootDragOver]);

  useEffect(() => {
    if (!rootMenuPoint) return;

    const onPointerDown = (event: PointerEvent) => {
      if (rootMenuRef.current?.contains(event.target as Node)) return;
      setRootMenuPoint(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setRootMenuPoint(null);
    };

    const onScroll = () => setRootMenuPoint(null);

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [rootMenuPoint]);

  function openRootContextMenu(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('[data-file-tree-node]')) {
      setRootMenuPoint(null);
      return;
    }

    event.preventDefault();
    setRootMenuPoint({ x: event.clientX, y: event.clientY });
  }

  const rootMenuStyle = rootMenuPoint
    ? {
        position: 'fixed' as const,
        top: Math.min(rootMenuPoint.y, window.innerHeight - 48),
        left: Math.min(rootMenuPoint.x, window.innerWidth - 180),
      }
    : undefined;

  return (
    <div className="sidebar-wrapper shrink-0" data-collapsed={collapsed || undefined}>
    <aside
      className="flex h-screen w-72 shrink-0 flex-col"
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--bd-mid)' }}
    >
      {/* Wordmark */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4" style={{ borderBottom: '1px solid var(--bd)' }}>
        <span
          className="truncate text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: 'var(--txt-3)' }}
          title={rootDir}
        >
          {rootDirName}
        </span>
        <button
          onClick={() => goToSettings()}
          style={{ color: settingsIconColor, background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', borderRadius: '4px', transition: 'color 0.1s, background 0.1s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--txt-2)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = settingsIconColor; (e.currentTarget as HTMLElement).style.background = 'none'; }}
          title="Settings"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>

      {/* Search bar (replaces new-file input) */}
      <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--bd)' }}>
        <button
          className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs transition-colors"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--bd)',
            color: 'var(--txt-3)',
            cursor: 'pointer',
            boxShadow: 'none',
            transition: 'border-color 120ms ease, box-shadow 120ms ease',
          }}
          onClick={() => setShowSearch(true)}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd-strong)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px var(--accent-soft)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 10L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="flex-1">Search files…</span>
          <kbd
            className="rounded px-1 py-0.5 text-[10px] leading-none"
            style={{ background: 'var(--surface-3)', color: 'var(--txt-4)' }}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      {/* File tree */}
      <div
        className="min-h-0 flex-1 overflow-auto px-2 py-2"
        onContextMenu={openRootContextMenu}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
        style={{
          background: rootDragOver ? 'var(--surface-2)' : undefined,
          outline: rootDragOver ? '1px dashed var(--accent)' : undefined,
          outlineOffset: rootDragOver ? '-4px' : undefined,
        }}
      >
        <div className="flex min-h-full flex-col">
          <FileTree
            nodes={files}
            active={activeTreePath}
            onOpen={(path) => goToFiles(path)}
            onDelete={async (path) => {
              if (activeFile === path || loadingFile === path) {
                closeFile();
                goToFiles();
              }
              await deleteFile(path);
            }}
            onRename={async (path, newPath) => {
              await renameFile(path, newPath);
              if (activeFile === path) goToFiles(newPath);
            }}
          />
          <div className="flex-1" />
        </div>
      </div>

      {rootMenuPoint && (
        <div ref={rootMenuRef} className="ctx-content" style={rootMenuStyle} role="menu">
          <button
            type="button"
            className="ctx-item w-full border-0 bg-transparent text-left"
            onClick={() => {
              setRootMenuPoint(null);
              setNewRootFileOpen(true);
            }}
          >
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            New file at root
          </button>
          <button
            type="button"
            className="ctx-item w-full border-0 bg-transparent text-left"
            onClick={() => {
              setRootMenuPoint(null);
              setNewRootDirOpen(true);
            }}
          >
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h5l2-2h5v10H2V4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            New directory at root
          </button>
        </div>
      )}

      <CreateFileDialog open={newRootFileOpen} onOpenChange={setNewRootFileOpen} title="New file at root" />
      <CreateDirectoryDialog open={newRootDirOpen} onOpenChange={setNewRootDirOpen} title="New directory at root" onCreated={(p) => setPendingFileInDir(p)} />
      <CreateFileDialog open={pendingFileInDir !== undefined} onOpenChange={(open) => { if (!open) setPendingFileInDir(undefined); }} parentPath={pendingFileInDir} title="New file in directory" hint="Hide empty directories is on — create a file to ensure this directory stays visible." />

      <div className="pb-4">
        <hr style={{ border: 'none', borderTop: '1px solid var(--bd)', marginBottom: '12px' }} />
        <a
          href="https://seams.yakko.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-base"
          style={{ fontFamily: "'Courier New', Courier, monospace", color: 'var(--txt-3)', textDecoration: 'none' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--txt-2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--txt-3)'; }}
        >
          seams
        </a>
      </div>
    </aside>
    <button
      className="sidebar-toggle"
      onClick={onToggle}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {collapsed
          ? <polyline points="3,1 7,5 3,9" />
          : <polyline points="7,1 3,5 7,9" />
        }
      </svg>
      <span className="sidebar-toggle-tooltip">
        {collapsed ? 'Expand' : 'Collapse'} <kbd>⌘\</kbd>
      </span>
    </button>
    </div>
  );
}

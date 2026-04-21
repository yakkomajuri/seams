import { useEffect, useRef, useState, type DragEvent as ReactDragEvent } from 'react';
import type { FileNode } from '../../../src/types';
import { useFileStore } from '../stores/fileStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useUiStore } from '../stores/uiStore';
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent,
  ContextMenuItem, ContextMenuSeparator,
} from './ui/context-menu';
import CreateFileDialog from './CreateFileDialog';
import CreateDirectoryDialog from './CreateDirectoryDialog';
import { Dialog, DialogContent, DialogClose } from './ui/dialog';
import {
  DRAG_MIME,
  HOVER_OPEN_DELAY_MS,
  baseName,
  hasSeamsDrag,
  joinPath,
} from '../lib/drag';

interface Props {
  nodes: FileNode[];
  active?: string;
  onOpen: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string, newPath: string) => void;
}

function hasMarkdown(node: FileNode): boolean {
  if (node.type === 'file') return true;
  return (node.children ?? []).some(hasMarkdown);
}

export default function FileTree({ nodes, active, onOpen, onDelete, onRename }: Props) {
  const settings = useSettingsStore((s) => s.settings);
  const hideDirs = settings?.hideDirsWithoutMd ?? true;
  const newlyCreatedDirs = useFileStore((s) => s.newlyCreatedDirs);

  const visible = hideDirs
    ? nodes.filter((n) => n.type === 'file' || hasMarkdown(n) || newlyCreatedDirs.includes(n.path))
    : nodes;

  return (
    <div className="space-y-0.5">
      {visible.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          active={active}
          onOpen={onOpen}
          onDelete={onDelete}
          onRename={onRename}
          hideDirs={hideDirs}
        />
      ))}
    </div>
  );
}

interface NodeProps {
  node: FileNode;
  active?: string;
  onOpen: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string, newPath: string) => void;
  hideDirs: boolean;
}

const treeItemClassName = 'relative w-full rounded px-2 py-1.5 text-left text-sm';
const treeLabelClassName = 'block truncate text-sm leading-5';
const directoryTreeLabelClassName = `${treeLabelClassName} font-medium`;

function moveSourceInto(source: string, targetDir: string): string {
  return joinPath(targetDir, baseName(source));
}

function TreeNode({ node, active, onOpen, onDelete, onRename, hideDirs }: NodeProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newDirOpen, setNewDirOpen] = useState(false);
  const [pendingFileInDir, setPendingFileInDir] = useState<string | undefined>(undefined);
  const [dragOver, setDragOver] = useState(false);
  const directoryOpen = useUiStore((s) => s.openDirectories.includes(node.path));
  const setDirectoryOpen = useUiStore((s) => s.setDirectoryOpen);
  const newlyCreatedDirs = useFileStore((s) => s.newlyCreatedDirs);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimer = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };

  useEffect(() => () => clearOpenTimer(), []);

  useEffect(() => {
    if (!dragOver) return;
    const clear = () => {
      setDragOver(false);
      clearOpenTimer();
    };
    window.addEventListener('dragend', clear);
    window.addEventListener('drop', clear);
    return () => {
      window.removeEventListener('dragend', clear);
      window.removeEventListener('drop', clear);
    };
  }, [dragOver]);

  if (node.type === 'directory') {
    const children = hideDirs
      ? (node.children ?? []).filter((n) => n.type === 'file' || hasMarkdown(n) || newlyCreatedDirs.includes(n.path))
      : (node.children ?? []);

    function handleSummaryDragEnter(event: ReactDragEvent<HTMLElement>) {
      if (!hasSeamsDrag(event.dataTransfer)) return;
      const related = event.relatedTarget as Node | null;
      if (related && event.currentTarget.contains(related)) return;
      setDragOver(true);
      if (!directoryOpen && !openTimerRef.current) {
        openTimerRef.current = setTimeout(() => {
          setDirectoryOpen(node.path, true);
          openTimerRef.current = null;
        }, HOVER_OPEN_DELAY_MS);
      }
    }

    function handleSummaryDragLeave(event: ReactDragEvent<HTMLElement>) {
      const related = event.relatedTarget as Node | null;
      if (related && event.currentTarget.contains(related)) return;
      setDragOver(false);
      clearOpenTimer();
    }

    function handleDirDragOver(event: ReactDragEvent<HTMLElement>) {
      if (!hasSeamsDrag(event.dataTransfer)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }

    function handleDirDrop(event: ReactDragEvent<HTMLElement>) {
      if (!hasSeamsDrag(event.dataTransfer)) return;
      event.preventDefault();
      event.stopPropagation();
      const source = event.dataTransfer.getData(DRAG_MIME);
      setDragOver(false);
      clearOpenTimer();
      if (!source) return;
      const target = moveSourceInto(source, node.path);
      if (source === target) return;
      onRename(source, target);
    }

    return (
      <>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <details
              data-file-tree-dir
              open={directoryOpen}
              onDragOver={handleDirDragOver}
              onDrop={handleDirDrop}
            >
              <summary
                data-file-tree-node
                className={`${treeItemClassName} flex cursor-pointer select-none items-center gap-1.5`}
                style={{
                  color: 'var(--txt-2)',
                  background: dragOver ? 'var(--surface-3)' : undefined,
                  outline: dragOver ? '1px dashed var(--accent)' : undefined,
                  outlineOffset: dragOver ? '-1px' : undefined,
                }}
                onClick={(event) => {
                  event.preventDefault();
                  setDirectoryOpen(node.path, !directoryOpen);
                }}
                onDragEnter={handleSummaryDragEnter}
                onDragLeave={handleSummaryDragLeave}
                onMouseEnter={(e) => {
                  if (dragOver) return;
                  (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
                }}
                onMouseLeave={(e) => {
                  if (dragOver) return;
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <svg className="chevron h-2 w-2 shrink-0 transition-transform" viewBox="0 0 6 10" fill="none">
                  <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={directoryTreeLabelClassName}>{node.name}</span>
              </summary>
              <div className="ml-3 mt-0.5 pl-2" style={{ borderLeft: '1px solid var(--bd)' }}>
                <FileTree
                  nodes={children}
                  active={active}
                  onOpen={onOpen}
                  onDelete={onDelete}
                  onRename={onRename}
                />
              </div>
            </details>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => { setNewFileOpen(true); }}>
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              New file here
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => { setNewDirOpen(true); }}>
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h5l2-2h5v10H2V4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              New directory here
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <CreateFileDialog open={newFileOpen} onOpenChange={setNewFileOpen} parentPath={node.path} />
        <CreateDirectoryDialog open={newDirOpen} onOpenChange={setNewDirOpen} parentPath={node.path} onCreated={(p) => setPendingFileInDir(p)} />
        <CreateFileDialog open={pendingFileInDir !== undefined} onOpenChange={(open) => { if (!open) setPendingFileInDir(undefined); }} parentPath={pendingFileInDir} title="New file in directory" hint="Hide empty directories is on — create a file to ensure this directory stays visible." />
      </>
    );
  }

  // File node
  const isActive = active === node.path;

  function commitRename() {
    if (!renameValue) return;
    const dir = node.path.includes('/') ? node.path.slice(0, node.path.lastIndexOf('/') + 1) : '';
    onRename(node.path, dir + renameValue);
    setRenameOpen(false);
  }

  function handleFileDragStart(event: ReactDragEvent<HTMLButtonElement>) {
    event.dataTransfer.setData(DRAG_MIME, node.path);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            data-file-tree-node
            draggable
            onDragStart={handleFileDragStart}
            className={`${treeItemClassName} flex items-center gap-1.5`}
            style={{
              color: isActive ? 'var(--txt)' : 'var(--txt-2)',
              background: isActive ? 'var(--surface-3)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
            onClick={() => onOpen(node.path)}
          >
            <span className="h-2 w-2 shrink-0" aria-hidden="true" />
            <span className={treeLabelClassName}>{node.name}</span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={() => { setRenameValue(node.name); setRenameOpen(true); }}>
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
              <path d="M11 2L14 5L5 14H2V11L11 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem destructive onSelect={() => onDelete(node.path)}>
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4H5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent title="Rename file">
          <input
            className="w-full rounded px-2.5 py-2 text-sm outline-none"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--bd-mid)', color: 'var(--txt)' }}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setRenameOpen(false);
            }}
          />
          <div className="mt-3 flex justify-end gap-2">
            <DialogClose asChild>
              <button className="rounded px-3 py-1.5 text-xs" style={{ color: 'var(--txt-3)' }}>Cancel</button>
            </DialogClose>
            <button
              className="rounded px-3 py-1.5 text-xs font-medium"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              onClick={commitRename}
            >
              Rename
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

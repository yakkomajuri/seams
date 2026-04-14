import { useEffect, useState } from 'react';
import { useFileStore } from '../stores/fileStore';
import { Dialog, DialogClose, DialogContent } from './ui/dialog';

type Ext = '.md' | '.mdx' | '.txt';
const EXTENSIONS: Ext[] = ['.md', '.mdx', '.txt'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentPath?: string;
  title?: string;
  hint?: string;
}

export default function CreateFileDialog({
  open,
  onOpenChange,
  parentPath,
  title = 'New file',
  hint,
}: Props) {
  const createFile = useFileStore((s) => s.createFile);
  const [baseName, setBaseName] = useState('');
  const [ext, setExt] = useState<Ext>('.md');

  useEffect(() => {
    if (open) setBaseName('');
  }, [open]);

  async function commitCreate() {
    const trimmed = baseName.trim();
    if (!trimmed) return;

    const stripped = EXTENSIONS.reduce((n, e) => n.endsWith(e) ? n.slice(0, -e.length) : n, trimmed);
    const fileName = stripped + ext;
    const path = parentPath ? `${parentPath}/${fileName}` : fileName;
    await createFile(path);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title}>
        {hint && (
          <p className="mb-3 text-xs leading-relaxed" style={{ color: 'var(--txt-3)' }}>{hint}</p>
        )}
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded px-2.5 py-2 text-sm outline-none"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--bd-mid)', color: 'var(--txt)' }}
            placeholder="filename"
            value={baseName}
            onChange={(e) => setBaseName(e.target.value)}
            autoFocus
            onKeyDown={async (e) => {
              if (e.key === 'Enter') await commitCreate();
              if (e.key === 'Escape') onOpenChange(false);
            }}
          />
          <select
            className="rounded px-2 py-2 text-sm outline-none"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--bd-mid)', color: 'var(--txt)', cursor: 'pointer' }}
            value={ext}
            onChange={(e) => setExt(e.target.value as Ext)}
          >
            <option value=".md">.md</option>
            <option value=".mdx">.mdx</option>
            <option value=".txt">.txt</option>
          </select>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <DialogClose asChild>
            <button className="rounded px-3 py-1.5 text-xs" style={{ color: 'var(--txt-3)', cursor: 'pointer' }}>Cancel</button>
          </DialogClose>
          <button
            className="rounded px-3 py-1.5 text-xs font-medium"
            style={baseName.trim()
              ? { background: 'var(--txt)', color: 'var(--surface)', cursor: 'pointer' }
              : { background: 'var(--accent-soft)', color: 'var(--accent)', cursor: 'pointer' }}
            onClick={() => void commitCreate()}
          >
            Create
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

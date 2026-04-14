import { useEffect, useState } from 'react';
import { useFileStore } from '../stores/fileStore';
import { Dialog, DialogClose, DialogContent } from './ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentPath?: string;
  title?: string;
  onCreated?: (dirPath: string) => void;
}

export default function CreateDirectoryDialog({
  open,
  onOpenChange,
  parentPath,
  title = 'New directory',
  onCreated,
}: Props) {
  const createDirectory = useFileStore((s) => s.createDirectory);
  const [dirName, setDirName] = useState('');

  useEffect(() => {
    if (open) setDirName('');
  }, [open]);

  async function commitCreate() {
    const trimmedName = dirName.trim();
    if (!trimmedName) return;

    const path = parentPath ? `${parentPath}/${trimmedName}` : trimmedName;
    await createDirectory(path);
    onOpenChange(false);
    onCreated?.(path);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title}>
        <input
          className="w-full rounded px-2.5 py-2 text-sm outline-none"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--bd-mid)', color: 'var(--txt)' }}
          placeholder="directory-name"
          value={dirName}
          onChange={(e) => setDirName(e.target.value)}
          autoFocus
          onKeyDown={async (e) => {
            if (e.key === 'Enter') await commitCreate();
            if (e.key === 'Escape') onOpenChange(false);
          }}
        />
        <div className="mt-3 flex justify-end gap-2">
          <DialogClose asChild>
            <button className="rounded px-3 py-1.5 text-xs" style={{ color: 'var(--txt-3)', cursor: 'pointer' }}>Cancel</button>
          </DialogClose>
          <button
            className="rounded px-3 py-1.5 text-xs font-medium"
            style={dirName.trim()
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

export const DRAG_MIME = 'application/x-seams-path';
export const HOVER_OPEN_DELAY_MS = 600;

export function hasSeamsDrag(dataTransfer: DataTransfer): boolean {
  const types = dataTransfer.types;
  for (let i = 0; i < types.length; i += 1) {
    if (types[i] === DRAG_MIME) return true;
  }
  return false;
}

export function parentDir(p: string): string {
  const idx = p.lastIndexOf('/');
  return idx >= 0 ? p.slice(0, idx) : '';
}

export function baseName(p: string): string {
  const idx = p.lastIndexOf('/');
  return idx >= 0 ? p.slice(idx + 1) : p;
}

export function joinPath(dir: string, name: string): string {
  return dir ? `${dir}/${name}` : name;
}

export function isSameOrDescendant(childPath: string, ancestorPath: string): boolean {
  if (!ancestorPath) return true;
  if (childPath === ancestorPath) return true;
  return childPath.startsWith(`${ancestorPath}/`);
}

import type { FileNode } from '../../../src/types';
import type { SeamsEditor } from './editorSchema';

export interface PageLinkItem {
  title: string;
  subtext: string;
  onItemClick: () => void;
  aliases: string[];
  group: string;
}

export function collectFiles(nodes: FileNode[]): FileNode[] {
  const files: FileNode[] = [];
  function visit(entries: FileNode[]) {
    for (const entry of entries) {
      if (entry.type === 'file') {
        files.push(entry);
      } else if (entry.children) {
        visit(entry.children);
      }
    }
  }
  visit(nodes);
  return files;
}

function fileDisplayName(path: string): string {
  const name = path.split('/').pop() ?? path;
  return name.replace(/\.(md|mdx|txt)$/, '');
}

export function buildPageUrl(filePath: string, linkRoot: string): string {
  // Remove leading ./
  let clean = filePath.replace(/^\.\//, '');

  // Strip index files (e.g. "about/index.md" → "about")
  clean = clean.replace(/\/index\.(md|mdx|txt)$/, '');
  // Strip file extensions from non-index pages.
  clean = clean.replace(/\.(md|mdx|txt)$/, '');

  const root = linkRoot.replace(/\/+$/, '');
  return root ? `${root}/${clean}` : `/${clean}`;
}

export function getPageLinkItems(
  editor: SeamsEditor,
  files: FileNode[],
  linkRoot: string,
  activeFile?: string,
): PageLinkItem[] {
  return collectFiles(files)
    .filter((f) => f.path !== activeFile)
    .map((f) => {
      const displayName = fileDisplayName(f.path);
      const url = buildPageUrl(f.path, linkRoot);

      return {
        title: displayName,
        subtext: f.path.replace(/^\.\//, ''),
        aliases: [f.path.replace(/^\.\//, ''), displayName.toLowerCase()],
        group: 'Pages',
        onItemClick: () => {
          editor.createLink(url, displayName);
        },
      };
    });
}

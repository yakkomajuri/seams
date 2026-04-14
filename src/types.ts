export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface FileContent {
  path: string;
  content: string;
  frontmatter: Record<string, unknown>;
  body: string;
}

export type SearchMatchKind = 'name' | 'content';

export interface SearchContentMatch {
  line: number;
  preview: string;
}

export interface SearchResult {
  path: string;
  fileName: string;
  matchKinds: SearchMatchKind[];
  contentMatch?: SearchContentMatch;
}

export type WsMessage =
  | { type: 'file:changed'; path: string }
  | { type: 'file:created'; path: string }
  | { type: 'file:deleted'; path: string }
  | { type: 'server:config-changed' };

export type Theme = 'neutral-dark' | 'neutral-light';

export interface SeamsConfig {
  depth: number;
  defaultPort: number;
  assets: string;
  autoSave: boolean;
  autoSaveDelay: number;
  hideDirsWithoutMd: boolean;
  theme: Theme;
  ignoreDirs: string[];
  ignoreFiles: string[];
  linkRoot: string;
}

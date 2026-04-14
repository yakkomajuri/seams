import { create } from 'zustand';
import type { FileNode } from '../../../src/types';
import { api } from '../lib/api';
import { normalizeFilePath } from '../lib/filePaths';
import { normalizeMarkdownAssetPaths } from '../lib/markdownAssetPaths';
import { collectDirectoryPaths } from '../lib/openDirectories';
import { useUiStore } from './uiStore';

interface FileStore {
  files: FileNode[];
  activeFile?: string;
  loadingFile?: string;
  markdown: string;
  frontmatter: Record<string, unknown>;
  newlyCreatedDirs: string[];
  fetchFiles: () => Promise<void>;
  closeFile: () => void;
  openFile: (path: string) => Promise<void>;
  saveFile: (path: string, body: string, fm: Record<string, unknown>) => Promise<void>;
  saveCurrent: (body: string, fm?: Record<string, unknown>) => Promise<void>;
  createFile: (path: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (path: string, newPath: string) => Promise<void>;
}

let openRequestVersion = 0;

export const useFileStore = create<FileStore>((set, get) => ({
  files: [],
  markdown: '',
  frontmatter: {},
  newlyCreatedDirs: [],
  async fetchFiles() {
    const { files } = await api.getFiles();
    useUiStore.getState().pruneOpenDirectories(collectDirectoryPaths(files));
    set({ files });
  },
  closeFile() {
    openRequestVersion += 1;
    set({ activeFile: undefined, loadingFile: undefined, markdown: '', frontmatter: {} });
  },
  async openFile(path) {
    const normalizedPath = normalizeFilePath(path);
    const requestVersion = ++openRequestVersion;
    set({ loadingFile: normalizedPath });

    try {
      const file = await api.getFile(normalizedPath);

      if (requestVersion !== openRequestVersion) return;

      const body = normalizeMarkdownAssetPaths(file.body, normalizedPath);
      set({
        activeFile: normalizedPath,
        loadingFile: undefined,
        markdown: body,
        frontmatter: file.frontmatter,
      });
      useUiStore.getState().addRecentFile(normalizedPath);
    } catch (error) {
      if (requestVersion === openRequestVersion) {
        set({ loadingFile: undefined });
      }
      throw error;
    }
  },
  async saveFile(path, body, fm) {
    const normalizedBody = normalizeMarkdownAssetPaths(body, path);
    await api.saveFile(path, normalizedBody, fm);
    if (get().activeFile === path) {
      set({ markdown: normalizedBody, frontmatter: fm });
    }
  },
  async saveCurrent(body, fm) {
    const active = get().activeFile;
    if (!active) return;
    const frontmatter = fm ?? get().frontmatter;
    await get().saveFile(active, body, frontmatter);
  },
  async createFile(path) {
    await api.createFile(path);
    await get().fetchFiles();
  },
  async createDirectory(path) {
    await api.createDirectory(path);
    set((s) => ({ newlyCreatedDirs: [...s.newlyCreatedDirs, path] }));
    await get().fetchFiles();
  },
  async deleteFile(path) {
    await api.deleteFile(path);
    await get().fetchFiles();
    if (get().activeFile === path || get().loadingFile === path) {
      openRequestVersion += 1;
      set({ activeFile: undefined, loadingFile: undefined, markdown: '', frontmatter: {} });
    }
  },
  async renameFile(path, newPath) {
    await api.renameFile(path, newPath);
    await get().fetchFiles();
    if (get().activeFile === path) {
      const file = await api.getFile(newPath);
      set({
        activeFile: newPath,
        loadingFile: undefined,
        markdown: normalizeMarkdownAssetPaths(file.body, newPath),
        frontmatter: file.frontmatter,
      });
    } else if (get().loadingFile === path) {
      set({ loadingFile: newPath });
    }
  },
}));

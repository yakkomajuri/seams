import type { FileContent, FileNode, SearchResult, SeamsConfig } from '../../../src/types';
import { encodeFilePath } from './filePaths';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = init?.body ? { 'Content-Type': 'application/json' } : {};
  const res = await fetch(url, { headers, ...init });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  getFiles: () => request<{ files: FileNode[] }>('/api/files'),
  getFile: (p: string) => request<FileContent>(`/api/files/${encodeFilePath(p)}`),
  saveFile: (p: string, body: string, frontmatter: Record<string, unknown>) =>
    request('/api/files/' + encodeFilePath(p), { method: 'PUT', body: JSON.stringify({ body, frontmatter }) }),
  saveRawFile: (p: string, content: string) =>
    request('/api/files/' + encodeFilePath(p), { method: 'PUT', body: JSON.stringify({ content }) }),
  createFile: (p: string) => request('/api/files', { method: 'POST', body: JSON.stringify({ path: p }) }),
  createDirectory: (p: string) => request('/api/directories', { method: 'POST', body: JSON.stringify({ path: p }) }),
  deleteFile: (p: string) => request('/api/files/' + encodeFilePath(p), { method: 'DELETE' }),
  renameFile: (p: string, newPath: string) => request('/api/files/' + encodeFilePath(p), { method: 'PATCH', body: JSON.stringify({ newPath }) }),
  search: (q: string) => request<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`),
  getSettings: () => request<{ settings: SeamsConfig; rootDir: string }>('/api/settings'),
  saveSettings: (settings: SeamsConfig) => request('/api/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
  async uploadFile(file: File): Promise<string> {
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json() as { url: string };
    return data.url;
  },
};

import { useEffect } from 'react';
import { useFileStore } from '../stores/fileStore';

export function useWebSocket(): void {
  const fetchFiles = useFileStore((s) => s.fetchFiles);
  const active = useFileStore((s) => s.activeFile);

  useEffect(() => {
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data) as { type: string; path: string };
      if (msg.type === 'file:created' || msg.type === 'file:deleted' || msg.type === 'server:config-changed') await fetchFiles();
      if (msg.type === 'file:changed' && msg.path === active) {
        if (confirm('File changed externally — Reload?')) window.location.reload();
      }
    };
    return () => ws.close();
  }, [active, fetchFiles]);
}

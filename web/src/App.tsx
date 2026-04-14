import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import EditorErrorBoundary from './components/EditorErrorBoundary';
import SearchOverlay from './components/SearchOverlay';
import SettingsPage from './components/SettingsPage';
import { useFileStore } from './stores/fileStore';
import { useSettingsStore } from './stores/settingsStore';
import { useUiStore } from './stores/uiStore';
import { useWebSocket } from './hooks/useWebSocket';
import { getCurrentRoute, goToFiles } from './lib/router';

export default function App() {
  const fetchFiles = useFileStore((s) => s.fetchFiles);
  const activeFile = useFileStore((s) => s.activeFile);
  const loadingFile = useFileStore((s) => s.loadingFile);
  const closeFile = useFileStore((s) => s.closeFile);
  const openFile = useFileStore((s) => s.openFile);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const theme = useSettingsStore((s) => s.settings?.theme ?? 'neutral-dark');
  const rootDir = useSettingsStore((s) => s.rootDir);
  const setShowSearch = useUiStore((s) => s.setShowSearch);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const [route, setRoute] = useState(() => getCurrentRoute());

  useWebSocket();

  useEffect(() => {
    fetchFiles();
    fetchSettings();
  }, [fetchFiles, fetchSettings]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.title = rootDir ? `seams — ${rootDir}` : 'seams';
  }, [rootDir]);

  useEffect(() => {
    const syncRoute = () => setRoute(getCurrentRoute());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    if (!route || window.location.pathname === '/') {
      goToFiles(undefined, { replace: true });
    }
  }, [route]);

  useEffect(() => {
    if (!route || route.kind !== 'files') return;

    if (!route.path) {
      if (activeFile || loadingFile) closeFile();
      return;
    }

    if (route.path === activeFile || route.path === loadingFile) return;

    void openFile(route.path).catch(() => {
      closeFile();
      goToFiles(undefined, { replace: true });
    });
  }, [activeFile, closeFile, loadingFile, openFile, route]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setShowSearch, toggleSidebar]);

  return (
    <div className="flex" style={{ background: 'var(--canvas)' }}>
      <Sidebar settingsOpen={route?.kind === 'settings'} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className="h-screen flex-1 overflow-auto" style={{ background: 'var(--canvas)' }}>
        {route?.kind === 'settings' ? <SettingsPage /> : <EditorErrorBoundary><Editor /></EditorErrorBoundary>}
      </main>
      <SearchOverlay />
    </div>
  );
}

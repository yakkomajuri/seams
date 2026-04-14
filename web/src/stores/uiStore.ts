import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { pruneDirectoryPaths, setDirectoryPathOpen } from '../lib/openDirectories';

const MAX_RECENT_FILES = 5;

interface UiStore {
  showSearch: boolean;
  openDirectories: string[];
  sidebarCollapsed: boolean;
  recentFiles: string[];
  setShowSearch: (v: boolean) => void;
  setDirectoryOpen: (path: string, open: boolean) => void;
  pruneOpenDirectories: (validPaths: string[]) => void;
  toggleSidebar: () => void;
  addRecentFile: (path: string) => void;
}

interface PersistedUiState {
  openDirectories: string[];
  sidebarCollapsed: boolean;
  recentFiles: string[];
}

export const useUiStore = create<UiStore>()(
  persist<UiStore, [], [], PersistedUiState>(
    (set) => ({
      showSearch: false,
      openDirectories: [],
      sidebarCollapsed: false,
      recentFiles: [],
      setShowSearch: (showSearch) => set({ showSearch }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setDirectoryOpen: (path, open) => set((state) => {
        const openDirectories = setDirectoryPathOpen(state.openDirectories, path, open);
        return openDirectories === state.openDirectories ? state : { openDirectories };
      }),
      pruneOpenDirectories: (validPaths) => set((state) => {
        const openDirectories = pruneDirectoryPaths(state.openDirectories, validPaths);
        return openDirectories === state.openDirectories ? state : { openDirectories };
      }),
      addRecentFile: (path) => set((state) => {
        const filtered = state.recentFiles.filter((f) => f !== path);
        return { recentFiles: [path, ...filtered].slice(0, MAX_RECENT_FILES) };
      }),
    }),
    {
      name: 'seams-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ openDirectories: state.openDirectories, sidebarCollapsed: state.sidebarCollapsed, recentFiles: state.recentFiles }),
    },
  ),
);

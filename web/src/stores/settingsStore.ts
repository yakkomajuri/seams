import { create } from 'zustand';
import type { SeamsConfig } from '../../../src/types';
import { api } from '../lib/api';

interface SettingsStore {
  settings?: SeamsConfig;
  rootDir?: string;
  fetchSettings: () => Promise<void>;
  updateSettings: (next: SeamsConfig) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: undefined,
  rootDir: undefined,
  async fetchSettings() {
    const { settings, rootDir } = await api.getSettings();
    set({ settings, rootDir });
  },
  async updateSettings(next) {
    await api.saveSettings(next);
    set({ settings: next });
  },
}));

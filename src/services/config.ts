import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { SeamsConfig } from '../types.js';

export const DEFAULT_CONFIG: SeamsConfig = {
  depth: 5,
  defaultPort: 4444,
  assets: './assets',
  autoSave: true,
  autoSaveDelay: 1000,
  hideDirsWithoutMd: true,
  theme: 'neutral-dark',
  ignoreDirs: [],
  ignoreFiles: [],
  linkRoot: '',
};

const CONFIG_FILE = '.seamsrc';

export async function loadConfig(rootDir: string): Promise<Partial<SeamsConfig>> {
  const configPath = path.join(rootDir, CONFIG_FILE);
  try {
    const raw = await fs.readFile(configPath, 'utf8');
    return normalizeConfig(JSON.parse(raw) as Partial<SeamsConfig>);
  } catch {
    return {};
  }
}

export async function writeConfig(rootDir: string, config: SeamsConfig): Promise<void> {
  const configPath = path.join(rootDir, CONFIG_FILE);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
}

export function mergeConfig(...parts: Array<Partial<SeamsConfig>>): SeamsConfig {
  const merged: SeamsConfig = { ...DEFAULT_CONFIG };
  for (const rawPart of parts) {
    const part = normalizeConfig(rawPart);
    for (const [key, value] of Object.entries(part) as Array<[keyof SeamsConfig, SeamsConfig[keyof SeamsConfig] | undefined]>) {
      if (value !== undefined) {
        merged[key] = value as never;
      }
    }
  }
  return merged;
}

export async function loadMergedConfig(rootDir: string, runtimeConfig: SeamsConfig): Promise<SeamsConfig> {
  return mergeConfig(runtimeConfig, await loadConfig(rootDir));
}

function normalizeConfig(config: Partial<SeamsConfig>): Partial<SeamsConfig> {
  const next: Partial<SeamsConfig> = { ...config };

  if ('ignoreDirs' in next) {
    next.ignoreDirs = normalizeStringArray(next.ignoreDirs);
  }

  if ('ignoreFiles' in next) {
    next.ignoreFiles = normalizeStringArray(next.ignoreFiles);
  }

  return next;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

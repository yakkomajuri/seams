import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useSettingsStore } from '../stores/settingsStore';
import { Switch } from './ui/switch';
import JsonCodeEditor from './JsonCodeEditor';

type SettingsTab = 'form' | 'raw';
type RawSaveState = 'idle' | 'saving' | 'saved' | 'error';

function formatPathList(paths: string[]): string {
  return paths.join('\n');
}

function parsePathList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const dark = useSettingsStore((s) => s.settings?.theme !== 'neutral-light');
  const [tab, setTab] = useState<SettingsTab>('form');
  const [rawConfig, setRawConfig] = useState('');
  const [rawLoaded, setRawLoaded] = useState(false);
  const [rawSaveState, setRawSaveState] = useState<RawSaveState>('idle');
  const [rawError, setRawError] = useState<string | null>(null);

  async function loadRawConfig(): Promise<void> {
    try {
      const file = await api.getFile('.seamsrc');
      setRawConfig(file.content);
    } catch {
      setRawConfig(JSON.stringify(settings ?? {}, null, 2));
    } finally {
      setRawLoaded(true);
      setRawSaveState('idle');
      setRawError(null);
    }
  }

  async function saveRawConfig(): Promise<void> {
    setRawSaveState('saving');
    setRawError(null);

    try {
      JSON.parse(rawConfig);
    } catch (error) {
      setRawSaveState('error');
      setRawError(error instanceof Error ? error.message : 'Invalid JSON');
      return;
    }

    try {
      await api.saveRawFile('.seamsrc', rawConfig);
      await fetchSettings();
      setRawSaveState('saved');
    } catch (error) {
      setRawSaveState('error');
      setRawError(error instanceof Error ? error.message : 'Failed to save .seamsrc');
    }
  }

  useEffect(() => {
    if (tab !== 'raw' || rawLoaded) return;
    void loadRawConfig();
  }, [rawLoaded, tab]);

  if (!settings) return null;

  const set = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) =>
    updateSettings({ ...settings, [key]: value });

  const inputStyle = {
    background: 'var(--surface-2)',
    border: '1px solid var(--bd)',
    color: 'var(--txt)',
  };

  return (
    <div className="mx-auto max-w-3xl px-12 py-10">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--txt-3)' }}>
          Settings
        </h2>
      </div>

      <div
        className="mb-8 inline-flex items-center rounded-md p-0.5"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--bd)' }}
      >
        {([
          { key: 'form', label: 'Visual' },
          { key: 'raw', label: '.seamsrc' },
        ] as const).map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              className="rounded px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: active ? 'var(--surface-3)' : 'transparent',
                color: active ? 'var(--txt)' : 'var(--txt-4)',
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--txt-3)'; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--txt-4)'; }}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'raw' ? (
        <section>
          {/* Editor shell */}
          <div
            className="overflow-hidden rounded-md"
            style={{ border: '1px solid var(--bd-mid)' }}
          >
            {/* Toolbar */}
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ background: 'var(--surface-3)', borderBottom: '1px solid var(--bd)' }}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="h-3.5 w-3.5 shrink-0"
                  viewBox="0 0 12 14"
                  fill="none"
                  style={{ color: 'var(--txt-4)' }}
                >
                  <path d="M1.5 1.5h6l3 3v8.5H1.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
                  <path d="M7.5 1.5v3H10.5" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
                </svg>
                <span
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 12,
                    color: 'var(--txt-3)',
                    letterSpacing: '0.01em',
                  }}
                >
                  .seamsrc
                </span>
                {rawSaveState !== 'idle' && (
                  <span
                    style={{
                      fontSize: 11,
                      color: rawSaveState === 'error' ? '#c07878' : 'var(--txt-4)',
                    }}
                  >
                    {rawSaveState === 'saving'
                      ? '— saving…'
                      : rawSaveState === 'saved'
                        ? '— saved'
                        : '— error'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="rounded px-2 py-1 text-xs transition-colors"
                  style={{ color: 'var(--txt-4)', background: 'transparent', cursor: 'pointer' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--txt-3)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--txt-4)'; }}
                  onClick={() => { void loadRawConfig(); }}
                >
                  Reload
                </button>
                <button
                  className="rounded px-2.5 py-1 text-xs font-medium"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)', cursor: 'pointer' }}
                  onClick={() => { void saveRawConfig(); }}
                >
                  Save
                </button>
              </div>
            </div>

            {/* Config editor */}
            {rawLoaded ? (
              <JsonCodeEditor
                value={rawConfig}
                onChange={(v) => { setRawConfig(v); setRawSaveState('idle'); setRawError(null); }}
                onSave={() => { void saveRawConfig(); }}
                dark={dark}
              />
            ) : (
              <div
                style={{
                  background: 'var(--surface-2)',
                  color: 'var(--txt-4)',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 13,
                  lineHeight: '1.7',
                  minHeight: 400,
                  padding: '12px 16px',
                }}
              >
                Loading .seamsrc…
              </div>
            )}
          </div>

          {/* Error block */}
          {rawSaveState === 'error' && rawError && (
            <div
              className="mt-2"
              style={{
                background: 'rgba(200, 60, 60, 0.07)',
                borderLeft: '2px solid rgba(200, 60, 60, 0.4)',
                borderRadius: '0 3px 3px 0',
                padding: '8px 12px',
                color: '#c07070',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {rawError}
            </div>
          )}

          {/* Keyboard hint */}
          <p className="mt-2.5 flex items-center gap-1.5 text-xs" style={{ color: 'var(--txt-4)' }}>
            <kbd
              style={{
                fontFamily: 'inherit',
                fontSize: 11,
                background: 'var(--surface-3)',
                border: '1px solid var(--bd-mid)',
                borderRadius: 4,
                padding: '1px 5px',
                color: 'var(--txt-3)',
              }}
            >
              ⌘S
            </kbd>
            to save
          </p>
        </section>
      ) : (
      <div className="space-y-8">
        {/* Appearance + File tree — side by side */}
        <div className="grid grid-cols-2 gap-8">
          <section>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--txt-4)' }}>
              Appearance
            </p>
            <div className="flex flex-col gap-2">
              <p className="text-sm" style={{ color: 'var(--txt-2)' }}>Theme</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'neutral-dark', label: 'Neutral dark', desc: 'Pure grayscale' },
                  { value: 'neutral-light', label: 'Neutral light', desc: 'Pure grayscale' },
                ] as const).map((t) => (
                  <button
                    key={t.value}
                    className="rounded-md px-3 py-2 text-left text-xs transition-colors"
                    style={{
                      background: settings.theme === t.value ? 'var(--accent-soft)' : 'var(--surface-2)',
                      border: settings.theme === t.value ? '1px solid var(--accent)' : '1px solid var(--bd)',
                      color: settings.theme === t.value ? 'var(--accent)' : 'var(--txt-2)',
                    }}
                    onClick={() => set('theme', t.value)}
                  >
                    <span className="font-medium">{t.label}</span>
                    <span className="block" style={{ color: 'var(--txt-4)', fontSize: 11 }}>{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--txt-4)' }}>
              File tree
            </p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm" style={{ color: 'var(--txt-2)' }}>Hide empty directories</p>
                <p className="text-xs" style={{ color: 'var(--txt-4)' }}>Hide folders with no markdown or MDX files</p>
              </div>
              <Switch
                checked={settings.hideDirsWithoutMd ?? true}
                onCheckedChange={(v) => set('hideDirsWithoutMd', v)}
              />
            </div>
          </section>
        </div>

        <div style={{ height: '1px', background: 'var(--bd)' }} />

        {/* Editor */}
        <section>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--txt-4)' }}>
            Editor
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm" style={{ color: 'var(--txt-2)' }}>Enable auto-save</p>
                <p className="text-xs" style={{ color: 'var(--txt-4)' }}>Automatically save files after edits</p>
              </div>
              <Switch checked={settings.autoSave} onCheckedChange={(v) => set('autoSave', v)} />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs" style={{ color: 'var(--txt-3)' }}>Auto-save delay (ms)</span>
              <input
                className="w-full rounded px-3 py-2 text-sm outline-none"
                style={inputStyle}
                type="number"
                value={settings.autoSaveDelay}
                onChange={(e) => set('autoSaveDelay', Number(e.target.value))}
              />
            </label>
          </div>
        </section>

        <div style={{ height: '1px', background: 'var(--bd)' }} />

        {/* Server */}
        <section>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--txt-4)' }}>
            Server
          </p>
          <div className="grid grid-cols-3 gap-6">
            <label className="block">
              <span className="mb-1.5 block text-xs" style={{ color: 'var(--txt-3)' }}>Scan depth</span>
              <input
                className="w-full rounded px-3 py-2 text-sm outline-none"
                style={inputStyle}
                type="number"
                value={settings.depth}
                onChange={(e) => set('depth', Number(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs" style={{ color: 'var(--txt-3)' }}>Default port</span>
              <input
                className="w-full rounded px-3 py-2 text-sm outline-none"
                style={inputStyle}
                type="number"
                value={settings.defaultPort}
                onChange={(e) => set('defaultPort', Number(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs" style={{ color: 'var(--txt-3)' }}>Assets path</span>
              <input
                className="w-full rounded px-3 py-2 text-sm outline-none"
                style={inputStyle}
                value={settings.assets}
                onChange={(e) => set('assets', e.target.value)}
              />
              <span className="mt-1.5 block text-xs" style={{ color: 'var(--txt-4)' }}>
                Restart seams to serve from the new path. Changing this won't update existing image references.
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs" style={{ color: 'var(--txt-3)' }}>Link root</span>
              <input
                className="w-full rounded px-3 py-2 text-sm outline-none"
                style={inputStyle}
                value={settings.linkRoot ?? ''}
                onChange={(e) => set('linkRoot', e.target.value)}
                placeholder="/blog"
              />
              <span className="mt-1.5 block text-xs" style={{ color: 'var(--txt-4)' }}>
                Prefix prepended to page links (e.g. /blog). Changing this won't update links in existing content.
              </span>
            </label>
            <label className="col-span-3 block">
              <span className="mb-1.5 block text-xs" style={{ color: 'var(--txt-3)' }}>Ignore directories</span>
              <textarea
                className="min-h-24 w-full rounded px-3 py-2 text-sm outline-none"
                style={inputStyle}
                value={formatPathList(settings.ignoreDirs)}
                onChange={(e) => set('ignoreDirs', parsePathList(e.target.value))}
                placeholder={'drafts\ncontent/private'}
              />
              <span className="mt-1.5 block text-xs" style={{ color: 'var(--txt-4)' }}>
                One relative path per line. Matching directories and everything inside them are ignored.
              </span>
            </label>
            <label className="col-span-3 block">
              <span className="mb-1.5 block text-xs" style={{ color: 'var(--txt-3)' }}>Ignore files</span>
              <textarea
                className="min-h-24 w-full rounded px-3 py-2 text-sm outline-none"
                style={inputStyle}
                value={formatPathList(settings.ignoreFiles)}
                onChange={(e) => set('ignoreFiles', parsePathList(e.target.value))}
                placeholder={'README.md\nREADME.mdx\ncontent/drafts/todo.txt'}
              />
              <span className="mt-1.5 block text-xs" style={{ color: 'var(--txt-4)' }}>
                One relative file path per line.
              </span>
            </label>
          </div>
        </section>
      </div>
      )}
    </div>
  );
}

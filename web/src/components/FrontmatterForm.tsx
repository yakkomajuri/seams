import React, { useEffect, useState } from 'react';

interface Props {
  frontmatter: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /** Live title value to keep the title row in sync with the h1 above */
  titleLiveValue?: string;
  /** Called immediately when the user types in the title field */
  onTitleLiveChange?: (value: string) => void;
}

type FrontmatterValueType = 'boolean' | 'array' | 'object' | 'text';

function isObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasStructuredChildren(value: unknown): boolean {
  return Array.isArray(value) && value.some((item) => isObjectValue(item) || Array.isArray(item));
}

function getType(value: unknown): FrontmatterValueType {
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (isObjectValue(value)) return 'object';
  return 'text';
}

function formatDisplayValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => (item === null ? 'null' : String(item ?? '')))
      .join(', ');
  }

  if (value === null) return 'null';
  return String(value ?? '');
}

function TypeIcon({ type }: { type: FrontmatterValueType }) {
  if (type === 'boolean') return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 8l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (type === 'array') return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
      <path d="M2 5h12M2 8h8M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
  if (type === 'object') return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
      <path d="M6 3.5C4.8 3.5 4 4.3 4 5.5v1c0 .7-.3 1.2-1 1.5.7.3 1 .8 1 1.5v1c0 1.2.8 2 2 2M10 3.5c1.2 0 2 .8 2 2v1c0 .7.3 1.2 1 1.5-.7.3-1 .8-1 1.5v1c0 1.2-.8 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
      <path d="M3 4h10M3 8h7M3 12h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function NestedFrontmatterValue({ value }: { value: unknown }) {
  if (isObjectValue(value)) {
    const entries = Object.entries(value);
    if (!entries.length) {
      return (
        <span className="block px-1 py-0.5 text-sm" style={{ color: 'var(--txt-4)' }}>
          Empty object
        </span>
      );
    }

    return <NestedFrontmatterGroup entries={entries} />;
  }

  if (Array.isArray(value) && hasStructuredChildren(value)) {
    if (!value.length) {
      return (
        <span className="block px-1 py-0.5 text-sm" style={{ color: 'var(--txt-4)' }}>
          Empty list
        </span>
      );
    }

    return (
      <NestedFrontmatterGroup
        entries={value.map((item, index) => [`[${index}]`, item] as const)}
      />
    );
  }

  const display = formatDisplayValue(value);
  return (
    <span
      className="block px-1 py-0.5 text-sm"
      style={{ color: display ? 'var(--txt-2)' : 'var(--txt-4)' }}
    >
      {display || 'Empty'}
    </span>
  );
}

function NestedFrontmatterGroup({ entries }: { entries: ReadonlyArray<readonly [string, unknown]> }) {
  return (
    <div
      className="rounded px-2 py-1"
      style={{ border: '1px solid var(--bd)', background: 'var(--surface-1)' }}
    >
      {entries.map(([key, value]) => {
        const type = getType(value);
        return (
          <div key={key} className="flex items-start gap-3 py-1">
            <div
              className="flex w-28 shrink-0 items-center gap-1.5 pt-0.5 text-xs"
              style={{ color: 'var(--txt-3)' }}
            >
              <TypeIcon type={type} />
              <span className="truncate">{key}</span>
            </div>
            <div className="min-w-0 flex-1">
              <NestedFrontmatterValue value={value} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function FrontmatterForm({ frontmatter, onChange, titleLiveValue, onTitleLiveChange }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addingKey, setAddingKey] = useState(false);
  const [newKey, setNewKey] = useState('');

  // Initialize editValue when the title field enters edit mode
  useEffect(() => {
    if (editing === 'title' && titleLiveValue !== undefined) {
      setEditValue(titleLiveValue);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const keys = Object.keys(frontmatter);
  if (!keys.length && !addingKey) {
    return (
      <div className="mb-3">
        <button
          className="text-xs transition-colors"
          style={{ color: 'var(--txt-4)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--txt-3)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--txt-4)'; }}
          onClick={() => setAddingKey(true)}
        >
          + Add property
        </button>
      </div>
    );
  }

  function commitValue(key: string, raw: string) {
    const existing = frontmatter[key];
    let parsed: unknown = raw;
    if (typeof existing === 'boolean') parsed = raw === 'true';
    if (Array.isArray(existing)) parsed = raw.split(',').map((s) => s.trim()).filter(Boolean);
    onChange({ ...frontmatter, [key]: parsed });
    setEditing(null);
  }

  function deleteKey(key: string) {
    const next = { ...frontmatter };
    delete next[key];
    onChange(next);
  }

  function addProperty() {
    const k = newKey.trim();
    if (!k) { setAddingKey(false); setNewKey(''); return; }
    onChange({ ...frontmatter, [k]: '' });
    setNewKey('');
    setAddingKey(false);
    setEditing(k);
  }

  return (
    <div className="mb-2" style={{ borderBottom: '1px solid var(--bd)' }}>
      <div className="pb-2">
        {keys.map((key) => {
          const value = frontmatter[key];
          const type = getType(value);
          const isStructured = type === 'object' || (type === 'array' && hasStructuredChildren(value));
          const isEditing = editing === key;
          const display = formatDisplayValue(value);
          // For the title field, show the live value from the h1 above
          const isTitleField = key === 'title' && titleLiveValue !== undefined;
          const shownDisplay = isTitleField ? titleLiveValue : display;

          return (
            <div
              key={key}
              className="group flex items-start gap-3 rounded px-2 py-1.5"
              style={{ marginLeft: '-8px' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {/* Key column */}
              <div
                className="flex w-32 shrink-0 items-center gap-1.5 pt-0.5 text-xs"
                style={{ color: 'var(--txt-3)' }}
              >
                <TypeIcon type={type} />
                <span className="truncate">{key}</span>
              </div>

              {/* Value column */}
              {type === 'boolean' ? (
                <button
                  className="flex h-5 w-5 items-center justify-center rounded"
                  style={{
                    background: !!value ? 'var(--accent-soft)' : 'var(--surface-3)',
                    border: `1px solid ${!!value ? 'var(--accent)' : 'var(--bd-mid)'}`,
                    color: !!value ? 'var(--accent)' : 'var(--txt-4)',
                    marginTop: '2px',
                  }}
                  onClick={() => onChange({ ...frontmatter, [key]: !value })}
                >
                  {!!value && (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ) : isEditing ? (
                isTitleField ? (
                  <input
                    className="flex-1 rounded px-2 py-0.5 text-sm outline-none"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--bd-mid)', color: 'var(--txt)' }}
                    value={editValue}
                    autoFocus
                    onChange={(e) => {
                      setEditValue(e.target.value);
                      onTitleLiveChange?.(e.target.value);
                    }}
                    onBlur={(e) => commitValue(key, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitValue(key, (e.target as HTMLInputElement).value);
                      if (e.key === 'Escape') setEditing(null);
                    }}
                  />
                ) : (
                  <input
                    className="flex-1 rounded px-2 py-0.5 text-sm outline-none"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--bd-mid)', color: 'var(--txt)' }}
                    defaultValue={display}
                    autoFocus
                    onBlur={(e) => commitValue(key, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitValue(key, (e.target as HTMLInputElement).value);
                      if (e.key === 'Escape') setEditing(null);
                    }}
                  />
                )
              ) : isStructured ? (
                <div className="min-w-0 flex-1 py-0.5">
                  <NestedFrontmatterValue value={value} />
                </div>
              ) : (
                <button
                  className="flex-1 rounded px-1 py-0.5 text-left text-sm transition-colors"
                  style={{ color: shownDisplay ? 'var(--txt-2)' : 'var(--txt-4)' }}
                  onClick={() => setEditing(key)}
                >
                  {shownDisplay || <span style={{ color: 'var(--txt-4)' }}>Empty</span>}
                </button>
              )}

              {/* Delete */}
              <button
                className="mt-0.5 shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--txt-4)' }}
                onClick={() => deleteKey(key)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--txt-3)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--txt-4)'; }}
                title="Remove property"
              >
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        })}

        {/* Add property row */}
        {addingKey ? (
          <div className="flex items-center gap-3 px-2 py-1.5" style={{ marginLeft: '-8px' }}>
            <input
              className="w-32 rounded px-2 py-0.5 text-xs outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--bd-mid)', color: 'var(--txt)' }}
              placeholder="property name"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              autoFocus
              onBlur={addProperty}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addProperty();
                if (e.key === 'Escape') { setAddingKey(false); setNewKey(''); }
              }}
            />
          </div>
        ) : (
          <button
            className="ml-2 mt-1 text-xs transition-colors"
            style={{ color: 'var(--txt-4)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--txt-3)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--txt-4)'; }}
            onClick={() => setAddingKey(true)}
          >
            + Add property
          </button>
        )}
      </div>
    </div>
  );
}

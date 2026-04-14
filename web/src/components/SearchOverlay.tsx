import { useEffect, useRef, useState } from 'react';
import type { SearchMatchKind, SearchResult } from '../../../src/types';
import { api } from '../lib/api';
import { goToFiles } from '../lib/router';
import { useUiStore } from '../stores/uiStore';

const MATCH_LABELS: Record<SearchMatchKind, string> = {
  name: 'name',
  content: 'content',
};

export default function SearchOverlay() {
  const show = useUiStore((s) => s.showSearch);
  const setShow = useUiStore((s) => s.setShowSearch);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function closeSearch(): void {
    setShow(false);
    setQ('');
    setResults([]);
    setIsSearching(false);
    setSelectedIndex(-1);
  }

  function openResult(result: SearchResult | undefined): void {
    if (!result) return;
    goToFiles(result.path);
    closeSearch();
  }

  function moveSelection(direction: 1 | -1): void {
    if (!results.length) return;
    setSelectedIndex((currentIndex) => {
      if (currentIndex < 0) {
        return direction === 1 ? 0 : results.length - 1;
      }

      return (currentIndex + direction + results.length) % results.length;
    });
  }

  useEffect(() => {
    if (!show) return;
    inputRef.current?.focus();
  }, [show]);

  useEffect(() => {
    if (!show) return undefined;

    if (!q.trim()) {
      setResults([]);
      setIsSearching(false);
      setSelectedIndex(-1);
      return undefined;
    }

    let cancelled = false;
    setIsSearching(true);
    const id = setTimeout(async () => {
      try {
        const { results } = await api.search(q);
        if (cancelled) return;
        setResults(results);
        setSelectedIndex(results.length > 0 ? 0 : -1);
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q, show]);

  useEffect(() => {
    if (!show || selectedIndex < 0) return;
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, show]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)' }}
      onClick={closeSearch}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--bd-mid)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input row */}
        <div className="flex items-center px-4" style={{ borderBottom: '1px solid var(--bd)' }}>
          <svg
            className="mr-3 h-4 w-4 shrink-0"
            style={{ color: 'var(--txt-3)' }}
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 10L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className="w-full py-3.5 text-sm outline-none"
            style={{ background: 'transparent', color: 'var(--txt)' }}
            placeholder="Search file names and contents…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveSelection(1);
                return;
              }

              if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveSelection(-1);
                return;
              }

              if (e.key === 'Enter') {
                e.preventDefault();
                openResult(results[selectedIndex]);
                return;
              }

              if (e.key === 'Escape') {
                e.preventDefault();
                closeSearch();
              }
            }}
            autoFocus
          />
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-72 overflow-auto p-1.5" role="listbox" aria-label="Search results">
            {results.map((r, index) => {
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={r.path}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  className="w-full rounded-lg px-3 py-2.5 text-left"
                  style={{
                    color: 'var(--txt)',
                    background: isSelected ? 'var(--surface-2)' : 'transparent',
                    border: isSelected ? '1px solid var(--bd-mid)' : '1px solid transparent',
                  }}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => openResult(r)}
                >
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1 truncate text-sm">{r.fileName}</div>
                    {r.matchKinds.map((kind) => (
                      <span
                        key={kind}
                        className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]"
                        style={{
                          color: kind === 'name' ? 'var(--txt)' : 'var(--txt-2)',
                          background: kind === 'name' ? 'var(--surface-3)' : 'var(--accent-soft)',
                        }}
                      >
                        {MATCH_LABELS[kind]}
                      </span>
                    ))}
                  </div>
                  <div
                    className="mt-0.5 text-xs"
                    style={{ color: 'var(--txt-3)', overflowWrap: 'anywhere' }}
                  >
                    {r.path}
                    {r.contentMatch ? `:${r.contentMatch.line}` : ''}
                  </div>
                  {r.contentMatch && (
                    <div
                      className="mt-1 text-sm"
                      style={{ color: 'var(--txt-2)', overflowWrap: 'anywhere' }}
                    >
                      {r.contentMatch.preview}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {q.trim() && !isSearching && results.length === 0 && (
          <div className="px-4 py-6 text-sm" style={{ color: 'var(--txt-3)' }}>
            No file names or content matches.
          </div>
        )}

        {!q.trim() && (
          <div className="px-4 py-6 text-sm" style={{ color: 'var(--txt-3)' }}>
            Search across file names and the first likely content hit.
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CategoryIcon } from '../categories/CategoryIcon';
import { getToolsRegistry } from '../../services/toolsApi';
import type { ToolDefinition } from '../../types/tools';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getToolsRegistry()
      .then((data) => {
        if (data && Array.isArray(data.tools)) {
          setTools(data.tools);
        } else {
          setTools([]);
        }
      })
      .catch(() => setTools([]));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global shortcut (Cmd+K / Ctrl+K / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fast token and fuzzy search index
  const safeTools = Array.isArray(tools) ? tools : [];
  const filteredTools = query.trim()
    ? safeTools
        .filter((t) => {
          const q = query.toLowerCase();
          return (
            t.name.toLowerCase().includes(q) ||
            (t.nameBn && t.nameBn.includes(q)) ||
            t.slug.toLowerCase().includes(q) ||
            t.module.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q))
          );
        })
        .slice(0, 10)
    : safeTools.slice(0, 8); // default quick tools

  const handleSelect = (tool: ToolDefinition) => {
    onClose();
    navigate(`/tools/${tool.module}/${tool.slug}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredTools.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredTools.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredTools[selectedIndex];
      if (selected) {
        handleSelect(selected);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-20">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search tools"
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl"
      >
        {/* Search Bar Input */}
        <div className="relative flex items-center border-b border-white/10 px-4 py-3 sm:px-6">
          <svg
            className="h-5 w-5 text-slate-400 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search across 242+ tools, formulas, converters (e.g. BMI, PDF, Matrix, QR)..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block rounded-md border border-white/10 bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 sm:p-3">
          {filteredTools.length > 0 ? (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {query.trim()
                  ? `Search Results (${filteredTools.length})`
                  : 'Popular & Quick Tools'}
              </div>

              {filteredTools.map((t, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => handleSelect(t)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors ${
                      isSelected ? 'bg-brand-500/20 text-white' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          isSelected ? 'bg-brand-500 text-white' : 'bg-white/5 text-brand-400'
                        }`}
                      >
                        <CategoryIcon name={t.icon || 'wrench'} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-bold text-white sm:text-sm">
                            {t.name}
                          </span>
                          {t.isFeatured && (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30">
                              ★
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-slate-400">{t.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-slate-400">
                      <span className="hidden md:inline rounded bg-white/5 px-2 py-0.5 capitalize">
                        {t.module.replace('-', ' ')}
                      </span>
                      <span>↵</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching tools found for <strong className="text-white">"{query}"</strong>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-white/5 bg-slate-950/60 px-4 py-2.5 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Navigate: <kbd className="font-mono text-white">↑</kbd>{' '}
              <kbd className="font-mono text-white">↓</kbd>
            </span>
            <span>
              Select: <kbd className="font-mono text-white">↵</kbd>
            </span>
          </div>
          <span>242 Registered Tools</span>
        </div>
      </div>
    </div>
  );
}

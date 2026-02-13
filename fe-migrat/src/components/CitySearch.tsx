import React, { useState, useRef, useEffect, useCallback } from 'react';
import { safeStorage } from '../lib/storage';

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  ariaLabel?: string;
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

const highlightMatches = (text: string, query: string) => {
  if (!query) return <>{text}</>;
  const q = escapeRegExp(query.trim());
  if (!q) return <>{text}</>;
  const rx = new RegExp(q, 'gi');
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = rx.exec(text)) !== null) {
    const idx = match.index;
    if (idx > lastIndex) parts.push(text.slice(lastIndex, idx));
    parts.push(<mark key={idx} className="bg-yellow-100 text-yellow-800 rounded">{text.slice(idx, idx + match[0].length)}</mark>);
    lastIndex = idx + match[0].length;
    if (match.index === rx.lastIndex) rx.lastIndex++;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : text;
};

export default function CitySearch({ value, onChange, options, placeholder, ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const ref = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const STORAGE_KEY = 'citySearchWeights_v1';
  const [weights, setWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    const raw = safeStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setWeights(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const persistWeight = useCallback((k: string, delta = 1) => {
    const next = { ...(weights || {}) };
    next[k] = (next[k] || 0) + delta;
    setWeights(next);
    try {
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, [weights]);

  const score = (opt: string, q: string) => {
    const o = opt.toLowerCase();
    const s = q.toLowerCase();
    if (!s) return 50;
    if (o === s) return 100;
    if (o.startsWith(s)) return 90;
    const idx = o.indexOf(s);
    if (idx !== -1) return Math.max(60, 80 - idx);
    let i = 0;
    let matches = 0;
    for (const ch of s) {
      const pos = o.indexOf(ch, i);
      if (pos === -1) break;
      matches++;
      i = pos + 1;
    }
    if (matches === 0) return 0;
    const base = Math.floor((matches / s.length) * 50);
    const w = weights[opt] || 0;
    return base + Math.min(w * 8, 40);
  };

  const filtered = (() => {
    const q = value.trim();
    const caps = options.slice();
    if (!q) return caps.slice(0, 50);
    const scored = caps
      .map((o) => ({ o, s: score(o, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.o.localeCompare(b.o))
      .map((x) => x.o);
    return scored.slice(0, 50);
  })();

  const [announce, setAnnounce] = useState('');

  useEffect(() => {
    if (value && filtered.length) setOpen(true);
    else setOpen(false);
    setFocusedIndex(-1);
    if (value) {
      setAnnounce(filtered.length > 0 ? `${filtered.length} suggestions` : 'No suggestions');
      setTimeout(() => setAnnounce(''), 1200);
    }
  }, [value, filtered.length]);

  const commit = useCallback((v: string) => {
    onChange(v);
    setOpen(false);
    setFocusedIndex(-1);
    setAnnounce(`Selected ${v}`);
    try { persistWeight(v, 1); } catch {}
    ref.current?.focus();
    setTimeout(() => setAnnounce(''), 1500);
  }, [onChange, persistWeight]);

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') { setFocusedIndex((i) => Math.min(i + 1, filtered.length - 1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { setFocusedIndex((i) => Math.max(i - 1, 0)); e.preventDefault(); }
    else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && filtered[focusedIndex]) { commit(filtered[focusedIndex]); e.preventDefault(); }
    } else if (e.key === 'Escape') { setOpen(false); setFocusedIndex(-1); }
  };

  useEffect(() => {
    const onDoc = (ev: MouseEvent) => {
      if (!ref.current) return;
      const target = ev.target as Node;
      if (ref.current.contains(target)) return;
      if (listRef.current && listRef.current.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const el = listRef.current.children[focusedIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => { if (options.length) setOpen(true); }}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className="w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoComplete="off"
      />
      <div aria-live="polite" className="sr-only">{announce || (open ? `${filtered.length} suggestions` : value && filtered.length === 0 ? 'No suggestions' : '')}</div>

      {open && (
        <ul ref={listRef} role="listbox" className="absolute z-30 left-0 right-0 mt-2 max-h-64 overflow-auto bg-white border rounded-md shadow-lg divide-y">
          {filtered.map((opt, idx) => (
            <li
              key={opt}
              role="option"
              aria-selected={focusedIndex === idx}
              className={`px-3 py-2 text-sm text-left ${focusedIndex === idx ? 'bg-blue-50' : 'bg-white'}`}
              onMouseDown={(e) => { e.preventDefault(); commit(opt); }}
              onMouseEnter={() => setFocusedIndex(idx)}
            >
              {highlightMatches(opt, value)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

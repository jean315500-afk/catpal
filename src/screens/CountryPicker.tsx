// A country field you can search: shows the chosen country; tapped, a search box and the list (filtered as you type —
// by the name in English or Korean, or the two-letter code). Enter takes the first match; Esc or a tap outside closes.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { countryName } from '../community/countries';

type Opt = { cc: string; label: string };
const fold = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[\s.'’-]+/g, '');

export default function CountryPicker({ value, options, onPick, placeholder, searchPh, style }: {
  value: string; options: Opt[]; onPick: (cc: string) => void; placeholder: string; searchPh: string; style: CSSProperties;
}) {
  const [open, setOpen] = useState(false), [q, setQ] = useState('');
  const box = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const index = useMemo(() => options.map((o) => ({ ...o, key: fold([o.label, countryName(o.cc, 'en-US'), countryName(o.cc, 'ko'), o.cc].join(' ')) })), [options]);
  const shown = useMemo(() => { const f = fold(q); return f ? index.filter((o) => o.key.includes(f)) : index; }, [index, q]);
  const cur = options.find((o) => o.cc === value);
  const pick = (cc: string) => { onPick(cc); setOpen(false); setQ(''); };
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const away = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) { setOpen(false); setQ(''); } };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);
  return (
    <div ref={box} style={{ position: 'relative', width: '100%' }}>
      {open ? (
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPh} aria-label={searchPh} autoComplete="off" spellCheck={false}
          onKeyDown={(e) => { if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') { e.preventDefault(); if (shown[0]) pick(shown[0].cc); } else if (e.key === 'Escape') { setOpen(false); setQ(''); } }}
          style={{ ...style, width: '100%', boxShadow: '0 0 0 2px #22304A inset' }} />
      ) : (
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="listbox"
          style={{ ...style, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', cursor: 'pointer', color: cur ? (style.color as string) : '#9AA1B0' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur ? cur.label : placeholder}</span>
          <span aria-hidden style={{ marginLeft: '8px', fontSize: '12px', color: '#9AA1B0' }}>🔍</span>
        </button>
      )}
      {open ? (
        <div role="listbox" style={{ position: 'absolute', zIndex: 30, left: 0, right: 0, bottom: 'calc(100% + 6px)', maxHeight: '240px', overflowY: 'auto', background: '#fff', borderRadius: '14px', boxShadow: '0 10px 30px rgba(34,48,74,.18)', padding: '6px 0', WebkitOverflowScrolling: 'touch' }}>
          {shown.length ? shown.map((o) => (
            <div key={o.cc} role="option" aria-selected={o.cc === value} onPointerDown={(e) => e.preventDefault()} onClick={() => pick(o.cc)}
              style={{ padding: '10px 14px', fontSize: '15px', fontWeight: o.cc === value ? 700 : 500, color: '#22304A', cursor: 'pointer', background: o.cc === value ? '#F3EEE4' : 'transparent' }}>
              {o.label}
            </div>
          )) : <div style={{ padding: '10px 14px', fontSize: '14px', color: '#9AA1B0' }}>—</div>}
        </div>
      ) : null}
    </div>
  );
}

// The account sheet: keep these letters with an email (sign up — the same account, its letters and photos kept), sign
// back in from another device (a link by email, no password), or settings (letter emails, matching, where I'm from,
// sign out, and — if there's one — a small donation link). Nothing here is ever shown to anyone else.
import { I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

const INK = '#22304A', MUTED = '#5E6A80';
const btn = { height: '52px', borderRadius: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as const;
const press = (fn: () => void) => (e: { key: string; preventDefault: () => void }) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };

function Check({ on, label, sub, onToggle, disabled }: { on: boolean; label: string; sub?: string; onToggle: () => void; disabled?: boolean }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 2px', cursor: disabled ? 'default' : 'pointer', textAlign: 'left' }}>
      <input type="checkbox" checked={on} onChange={onToggle} disabled={disabled} style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: INK, flex: 'none' }} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontWeight: 600, fontSize: '14.5px', lineHeight: '20px', color: INK }}>{I(label)}</span>
        {sub ? <span style={{ fontWeight: 400, fontSize: '12.5px', lineHeight: '17px', color: MUTED }}>{I(sub)}</span> : null}
      </span>
    </label>
  );
}

export default function AccountSheet({ v }: { v: Vals }) {
  const a = v.acct; if (!a) return null;
  const settings = a.mode === 'settings', signin = a.mode === 'signin';
  return (
    <div onClick={a.busy ? undefined : a.close} style={{ position: 'absolute', inset: '0', zIndex: 95, background: 'rgba(34,48,74,.36)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'cp-fade .2s ease' }}>
      <div role="dialog" aria-modal="true" aria-label={a.title} onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '460px', maxHeight: '92%', overflowY: 'auto', boxSizing: 'border-box', padding: '10px 22px 26px', background: '#FBF7EE', borderRadius: '26px 26px 0 0', boxShadow: '0 -10px 30px rgba(34,48,74,.18)', animation: 'cp-sheet .28s cubic-bezier(.2,.8,.2,1)' }}>
        <div style={{ width: '38px', height: '4px', borderRadius: '2px', background: '#E2DACB', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '21px', lineHeight: '27px', color: INK }}>{I(a.title)}</span>
          <span onClick={a.close} role="button" tabIndex={0} aria-label={a.closeLabel} onKeyDown={press(a.close)} style={{ flex: 'none', width: '32px', height: '32px', borderRadius: '16px', background: '#F0EBE1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '13px', color: INK }}>✕</span>
        </div>
        {a.sub ? <span style={{ display: 'block', marginTop: '4px', fontWeight: 500, fontSize: '14px', lineHeight: '20px', color: MUTED }}>{I(a.sub)}</span> : null}

        {a.sent ? (
          // the link has gone: what to do next
          <div role="status" style={{ marginTop: '18px', padding: '16px', borderRadius: '16px', background: '#EEF6EF', color: '#2E5F45', fontWeight: 600, fontSize: '14.5px', lineHeight: '21px' }}>✉️ {I(a.sent)}</div>
        ) : settings ? (
          <>
            {/* the account's address (never shown to anyone else), or a way to add one */}
            {a.emailLine ? <span style={{ display: 'block', marginTop: '14px', fontWeight: 600, fontSize: '13.5px', color: INK }}>{I(a.emailLine)}</span> : null}
            {a.resend ? <span onClick={a.toRegister} role="button" tabIndex={0} onKeyDown={press(a.toRegister)} style={{ display: 'inline-block', marginTop: '8px', fontWeight: 700, fontSize: '14px', color: INK, textDecoration: 'underline', cursor: 'pointer' }}>{I(a.resend)}</span> : null}
            <div style={{ marginTop: '10px', borderTop: '1px solid #EAE2D3' }}>
              <Check on={!!a.notify} label={a.notifyLabel} onToggle={a.toggleNotify} />
              <Check on={!!a.match} label={a.matchLabel} sub={a.matchSub} onToggle={a.toggleMatch} />
            </div>
            <label style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="cp-pp-label">{I(a.originLabel)}</span>
              <select value={a.origin || ''} onChange={a.setOrigin} aria-label={a.originLabel} style={{ height: '46px', padding: '0 12px', borderRadius: '14px', border: '1px solid #DDD3C2', background: '#fff', fontSize: '16px', fontWeight: 600, color: INK }}>
                {a.originOptions.map((o: any) => <option key={o.cc} value={o.cc}>{o.label}</option>)}
              </select>
            </label>
            {a.donate ? <a href={a.donate.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '18px', textAlign: 'center', fontWeight: 600, fontSize: '13.5px', color: '#8A5A2B' }}>{I(a.donate.label)}</a> : null}
            {a.signOut ? <span onClick={a.doSignOut} role="button" tabIndex={0} onKeyDown={press(a.doSignOut)} style={{ display: 'block', marginTop: '14px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: MUTED, textDecoration: 'underline', cursor: 'pointer' }}>{I(a.signOut)}</span> : null}
          </>
        ) : (
          <>
            <input type="email" inputMode="email" autoComplete="email" autoCapitalize="off" spellCheck={false} value={a.email} onChange={a.set} placeholder={a.emailPh} aria-label={a.emailPh}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); a.submit(); } }}
              style={{ marginTop: '16px', width: '100%', boxSizing: 'border-box', height: '52px', padding: '0 16px', borderRadius: '16px', border: '1.5px solid ' + (a.err ? '#E5483D' : '#E2DACB'), background: '#fff', fontFamily: 'inherit', fontWeight: 600, fontSize: '16px', color: INK, outline: 'none' }} />
            {!signin ? (
              <>
                <label style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span className="cp-pp-label">{I(a.originLabel)}</span>
                  <select value={a.origin || ''} onChange={a.setOrigin} aria-label={a.originLabel} style={{ height: '46px', padding: '0 12px', borderRadius: '14px', border: '1px solid #DDD3C2', background: '#fff', fontSize: '16px', fontWeight: 600, color: INK }}>
                    {a.originOptions.map((o: any) => <option key={o.cc} value={o.cc}>{o.label}</option>)}
                  </select>
                </label>
                {/* consent, asked plainly (nothing is ticked for you) */}
                <div style={{ marginTop: '6px' }}>
                  <Check on={!!a.notify} label={a.notifyLabel} onToggle={a.toggleNotify} disabled={a.busy} />
                  <Check on={!!a.match} label={a.matchLabel} sub={a.matchSub} onToggle={a.toggleMatch} disabled={a.busy} />
                </div>
              </>
            ) : null}
            {a.err ? <span role="alert" style={{ display: 'block', marginTop: '8px', fontWeight: 500, fontSize: '13px', color: '#D9442F' }}>{I(a.err)}</span> : null}
            <div className="dc-hover-8" onClick={a.busy ? undefined : a.submit} role="button" tabIndex={0} aria-busy={a.busy} onKeyDown={press(a.submit)}
              style={{ ...btn, marginTop: '14px', background: a.busy ? '#B9B2A4' : INK, boxShadow: a.busy ? 'none' : '0 10px 22px rgba(34,48,74,.2)' }}>
              <span style={{ fontWeight: 700, fontSize: 'var(--fs-button)', color: '#fff' }}>{I(a.busy ? a.busyLabel : a.go)}</span>
            </div>
            {a.switchLabel ? <span onClick={a.switchTo} role="button" tabIndex={0} onKeyDown={press(a.switchTo)} style={{ display: 'block', marginTop: '12px', textAlign: 'center', fontWeight: 600, fontSize: '13.5px', color: INK, textDecoration: 'underline', textUnderlineOffset: '3px', cursor: 'pointer' }}>{I(a.switchLabel)}</span> : null}
          </>
        )}
        <span style={{ display: 'block', marginTop: '14px', fontWeight: 500, fontSize: '11.5px', lineHeight: '16px', color: '#8E8A84', textAlign: 'center' }}>{I(a.privacy)}</span>
      </div>
    </div>
  );
}

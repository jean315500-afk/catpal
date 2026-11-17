// MASTER CONTROLS — for testing (held Passport in the dock). Locked: the master code. Unlocked: instant letters, letters
// on their way landed now, test stamps for me or another tester, Plus's features, the letter emails to me and how they
// went, letters new again, matching run now, sample screens.
// Every action is checked by the server (supabase/fix-2026-11-16-master-controls.sql); this is only its panel.
import type { CSSProperties, ReactNode } from 'react';
import type { Vals } from '../dc/runtime';

const BG = '#151B26', CARD = '#1F2735', LINE = '#2C3647', TXT = '#E8ECF3', DIM = '#8D97A8', ACC = '#F2B84B';
const mono = "ui-monospace,'SF Mono',Menlo,monospace";
const btn = (on = false): CSSProperties => ({ height: '40px', padding: '0 14px', borderRadius: '12px', border: '1px solid ' + (on ? ACC : LINE), background: on ? ACC : CARD,
  color: on ? '#1A1A1A' : TXT, fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', fontFamily: 'inherit' });

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: '16px' }}>
      <span style={{ display: 'block', fontFamily: mono, fontSize: '10.5px', letterSpacing: '.16em', textTransform: 'uppercase', color: DIM, marginBottom: '8px' }}>{title}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{children}</div>
    </div>
  );
}

export default function MasterPanel({ v }: { v: Vals }) {
  const m = v.master;
  if (!m) return null;
  const B = ({ k, label, go, on }: { k: string; label: string; go: () => void; on?: boolean }) => (
    <button type="button" onClick={go} disabled={!!m.busy} style={{ ...btn(on), opacity: m.busy && m.busy !== k ? 0.5 : 1 }}>{m.busy === k ? '…' : label}</button>
  );
  const who = (m.testers || []).find((t: any) => t.on);
  return (
    <div onClick={m.close} style={{ position: 'absolute', inset: '0', zIndex: 120, background: 'rgba(8,10,16,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div role="dialog" aria-modal="true" aria-label="Master controls" onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '460px', maxHeight: '90%', overflowY: 'auto', boxSizing: 'border-box', padding: '12px 18px 28px', background: BG, color: TXT, borderRadius: '24px 24px 0 0', boxShadow: '0 -10px 30px rgba(0,0,0,.4)', fontFamily: 'var(--font-body)' }}>
        <div style={{ width: '38px', height: '4px', borderRadius: '2px', background: LINE, margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 800, fontSize: '19px' }}>🛠 Master controls</span>
          <button type="button" onClick={m.close} aria-label="Close" style={{ ...btn(), width: '34px', height: '34px', padding: 0, borderRadius: '17px' }}>✕</button>
        </div>
        <span style={{ display: 'block', marginTop: '2px', fontSize: '12px', color: DIM }}>For testing. Only accounts unlocked with the master code can use these.</span>

        {m.msg ? <div role="status" style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '12px', background: '#1E3A2B', color: '#9BE3B5', fontWeight: 600, fontSize: '13.5px' }}>{m.msg}</div> : null}
        {m.err ? <div role="alert" style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '12px', background: '#3F1E22', color: '#FFB3B3', fontWeight: 600, fontSize: '13.5px' }}>{m.err}</div> : null}

        {m.loading ? <span style={{ display: 'block', marginTop: '18px', color: DIM }}>Loading…</span>
        : m.missing ? (
          <span style={{ display: 'block', marginTop: '18px', fontSize: '14px', lineHeight: '20px' }}>Not set up in the database yet: run <code style={{ fontFamily: mono, color: ACC }}>supabase/fix-2026-11-16-master-controls.sql</code> in the Supabase SQL Editor, and set the master code.</span>
        ) : m.locked ? (
          <form onSubmit={(e) => { e.preventDefault(); m.unlock(); }} style={{ marginTop: '18px', display: 'flex', gap: '8px' }}>
            <input type="password" value={m.code} onChange={m.setCode} placeholder="Master code" aria-label="Master code" autoComplete="off"
              style={{ flex: 1, minWidth: 0, height: '44px', padding: '0 14px', borderRadius: '12px', border: '1px solid ' + LINE, background: CARD, color: TXT, fontSize: '16px', fontFamily: 'inherit', outline: 'none' }} />
            <button type="submit" disabled={!!m.busy || !m.code} style={{ ...btn(true), height: '44px' }}>{m.busy === 'unlock' ? '…' : 'Unlock'}</button>
          </form>
        ) : (
          <>
            <div style={{ marginTop: '14px', borderRadius: '14px', background: CARD, padding: '6px 12px' }}>
              {(m.info || []).map((r: any) => (
                <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '6px 0', borderBottom: '1px solid ' + LINE, fontSize: '13px' }}>
                  <span style={{ color: DIM, flex: 'none' }}>{r.k}</span><span style={{ textAlign: 'right', fontWeight: 600, wordBreak: 'break-word' }}>{r.v}</span>
                </div>
              ))}
            </div>

            <Section title="Delivery">
              <B k="instant" on={m.instant} label={m.instant ? '⚡ Instant letters: ON' : '⚡ Instant letters: OFF'} go={m.toggleInstant} />
              <B k="land" label={`🛬 Land all on their way now (${m.flying})`} go={m.landNow} />
              <span style={{ width: '100%', fontSize: '12px', lineHeight: '17px', color: DIM }}>Instant: every letter you send lands at once, anywhere in the world (the screen before sending may still show the usual time). The other phone sees it within a few seconds.</span>
            </Section>

            <Section title="Test stamps">
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(m.testers || []).map((t: any) => (
                  <div key={t.id} onClick={t.pick} role="button" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '12px', cursor: 'pointer', background: t.on ? '#2A3550' : CARD, border: '1px solid ' + (t.on ? ACC : LINE) }}>
                    <span aria-hidden style={{ width: '8px', height: '8px', borderRadius: '4px', background: t.online ? '#4ADE80' : '#4B5566', flex: 'none' }} />
                    <span style={{ flex: 'none', maxWidth: '55%', fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</span>
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'right', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.stamps}</span>
                  </div>
                ))}
                <span style={{ fontSize: '12px', color: DIM }}>Green: active in the last 5 minutes. Test stamps go only to testers (accounts unlocked here), so real CatPals never get one.</span>
              </div>
              <select value={m.cc} onChange={(e) => m.setCc(e.target.value)} aria-label="Country"
                style={{ flex: '1 1 160px', height: '40px', padding: '0 10px', borderRadius: '12px', border: '1px solid ' + LINE, background: CARD, color: TXT, fontSize: '15px' }}>
                <option value="">Pick a country…</option>
                {(m.ccOpts || []).map((o: any) => <option key={o.cc} value={o.cc}>{o.label}</option>)}
              </select>
              <B k="give" label={`🎟 Give${who ? ' to ' + (who.me ? 'me' : who.label.replace(/^\S+\s/, '')) : ''}`} go={m.give} />
              <B k="giveSome" label="🎲 Give 8 random stamps" go={m.giveSome} />
              <B k="clear" label="Take test stamps away" go={m.clear} />
            </Section>

            <Section title="CatPal Plus">
              <B k="plus" on={m.plus} label={m.plus ? '✦ Plus features: ON' : '✦ Plus features: OFF'} go={m.togglePlus} />
              <span style={{ width: '100%', fontSize: '12px', lineHeight: '17px', color: DIM }}>Choose who a letter goes to, pick its stamp, the Fast Bird — on this device, for testing. Nothing is paid or charged; others still see “Coming soon”.</span>
            </Section>

            <Section title="Letter emails to me">
              {m.emails === null ? (
                <span style={{ width: '100%', fontSize: '12px', lineHeight: '17px', color: DIM }}>Run <code style={{ fontFamily: mono, color: ACC }}>supabase/fix-2026-11-17-stamps-match-origin.sql</code> to see them here.</span>
              ) : !m.emails.length ? (
                <span style={{ width: '100%', fontSize: '12px', lineHeight: '17px', color: DIM }}>None yet. An email goes about a minute after a letter lands — only if it's still unread then, letter emails are on, and the email is confirmed.</span>
              ) : (
                <div style={{ width: '100%', borderRadius: '14px', background: CARD, padding: '4px 12px' }}>
                  {m.emails.map((e: any) => (
                    <div key={e.key} style={{ padding: '6px 0', borderBottom: '1px solid ' + LINE, fontSize: '12.5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{e.what}</span>
                        <span style={{ fontWeight: 700, color: e.status === 'sent' ? '#9BE3B5' : e.status === 'failed' ? '#FFB3B3' : ACC }}>{e.status}</span>
                      </div>
                      <span style={{ display: 'block', color: DIM }}>{e.when}{e.why ? ' · ' + e.why : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Letters">
              <B k="unread" label="✉️ Mark my letters new again" go={m.unread} />
              <B k="match" label="🔀 Run matching now" go={m.runMatch} />
              <B k="refresh" label="🔄 Look for mail now" go={m.refresh} />
            </Section>

            <Section title="Screens">
              {(m.screens || []).map((s: any) => <B key={s.label} k={s.label} label={s.label} go={s.go} />)}
              <B k="startOver" label="Start over as a new visitor" go={m.startOver} />
            </Section>

            <Section title="This account">
              <B k="copy" label="Copy my id" go={m.copyId} />
              <B k="lock" label="🔒 Lock master controls here" go={m.lock} />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

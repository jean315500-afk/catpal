// notify-letters — "🐾 You've got a new cat letter", by email. Run every minute (Supabase Cron → this function).
//
// Each run: letters waiting for a CatPal are looked at again (process_match_queue), then the emails that are due are
// claimed (claim_emails — each one by one run only; see supabase/fix-2026-11-14-nomad-market.sql):
//   letter   a real letter (not the automatic welcome) has landed and is still unread → its recipient
//   matched  a letter that waited for a CatPal has landed with one → its sender
// Only people who said yes to letter emails, with a confirmed address. Just before each send it's asked again
// (email_still_wanted: read meanwhile? emails turned off?) — then skipped, not sent. A failed send is tried again
// (3 tries in all) and what went wrong is kept. The letter itself is never in the email: who it's from, and a link to
// that letter (no sign-in token in it — the app asks you to sign in if it must, and keeps the letter to open after).
//
// Settings (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY      the mail service's key (resend.com)
//   MAIL_FROM_ADDRESS   the address it's sent from, e.g. letters@your-domain (a domain verified with Resend); it shows
//                       as "CatPal <letters@your-domain>"
//   APP_URL             the app, e.g. https://catpal.vercel.app — "Open your letter" goes to APP_URL/?open=<letter id>
//   CRON_SECRET         any long random text; the schedule sends it as the "x-cron-secret" header
//   RESEND_API_URL      (optional, for local tests) where to send instead of Resend
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are there already. Missing a setting: nothing is claimed or marked sent,
// and the run answers 500 with what's missing.

const env = (k: string) => (globalThis as any).Deno?.env.get(k) || "";
const URL_ = env("SUPABASE_URL"), SERVICE = env("SUPABASE_SERVICE_ROLE_KEY");
const RESEND = env("RESEND_API_KEY"), FROM = env("MAIL_FROM_ADDRESS"), APP = env("APP_URL"), SECRET = env("CRON_SECRET");
const RESEND_URL = env("RESEND_API_URL") || "https://api.resend.com/emails";

const rpc = async (fn: string, args: Record<string, unknown> = {}) => {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: SERVICE, Authorization: "Bearer " + SERVICE, "content-type": "application/json" }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error(`${fn} ${r.status} ${(await r.text()).slice(0, 300)}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const oneLine = (s: string) => (s || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 40);
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

type Due = { id: string; kind: "letter" | "matched"; letter_id: string; email: string | null; from_name: string | null; to_name: string | null; attempts: number };

export function letterEmail(d: Due, appUrl: string) {
  const link = new URL(appUrl); link.searchParams.set("open", d.letter_id);
  const from = oneLine(d.from_name || "a CatPal"), to = oneLine(d.to_name || "a CatPal");
  const subject = d.kind === "matched" ? `🐾 Your letter found a CatPal: ${to}!` : `🐾 You’ve got a new cat letter from ${from}!`;
  const line = d.kind === "matched" ? `Your letter is with ${esc(to)} now. We’ll tell you when they write back.` : `${esc(from)} sent you a letter on CatPal.`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#F5EFE4;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#22304A">
  <div style="max-width:440px;margin:0 auto;background:#FBF7EE;border-radius:20px;padding:28px 24px;text-align:center">
    <div style="font-size:40px;line-height:1">✉️</div>
    <h1 style="margin:14px 0 6px;font-size:21px;line-height:28px">${d.kind === "matched" ? "Your letter found a CatPal" : "You’ve got a new cat letter"}</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:22px;color:#5E6A80">${line}</p>
    <a href="${esc(link.toString())}" style="display:inline-block;padding:14px 28px;border-radius:26px;background:#22304A;color:#fff;font-weight:700;font-size:15px;text-decoration:none">Open your letter</a>
    <p style="margin:22px 0 0;font-size:11px;line-height:16px;color:#9AA1B0">You get this because you turned on letter emails in CatPal. You can turn them off in Settings.</p>
  </div>
</body></html>`;
  const text = `${d.kind === "matched" ? `Your letter is with ${to} now.` : `${from} sent you a letter on CatPal.`}\n\nOpen your letter: ${link}\n\nYou can turn letter emails off in CatPal's Settings.`;
  return { subject, html, text };
}

export async function run(): Promise<{ status: number; body: unknown }> {
  const missing = [["RESEND_API_KEY", RESEND], ["MAIL_FROM_ADDRESS", FROM], ["APP_URL", APP]].filter(([, v]) => !v).map(([k]) => k);
  // (matching never needs mail: done first, whatever else is missing)
  try { await rpc("process_match_queue", { p_limit: 20 }); } catch (_) { /* tried again next minute */ }
  if (missing.length) return { status: 500, body: { error: "missing settings", missing } };
  const due: Due[] = (await rpc("claim_emails", { p_limit: 20 })) || [];
  let sent = 0, failed = 0, skipped = 0;
  for (const d of due) {
    try {
      // asked again just before: read meanwhile, emails turned off, address gone → not sent
      if (!d.email || !(await rpc("email_still_wanted", { p_id: d.id }))) { await rpc("finish_email", { p_id: d.id, p_result: "skipped", p_error: "not wanted at send time" }); skipped++; continue; }
      const m = letterEmail(d, APP);
      const r = await fetch(RESEND_URL, { method: "POST", headers: { Authorization: "Bearer " + RESEND, "content-type": "application/json" },
        body: JSON.stringify({ from: `CatPal <${FROM}>`, to: [d.email], subject: m.subject, html: m.html, text: m.text }) });
      if (r.ok) { await rpc("finish_email", { p_id: d.id, p_result: "sent" }); sent++; }
      else { await rpc("finish_email", { p_id: d.id, p_result: "failed", p_error: `mail service ${r.status}: ${(await r.text()).slice(0, 300)}` }); failed++; }
    } catch (e) {
      failed++;
      try { await rpc("finish_email", { p_id: d.id, p_result: "failed", p_error: String((e as Error)?.message || e).slice(0, 300) }); } catch (_) { /* stays "sending": taken again after 10 minutes */ }
    }
  }
  // (counts only: no address or link is ever logged)
  console.log(JSON.stringify({ claimed: due.length, sent, failed, skipped }));
  return { status: 200, body: { claimed: due.length, sent, failed, skipped } };
}

(globalThis as any).Deno?.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });
  if (!SECRET || req.headers.get("x-cron-secret") !== SECRET) return json(401, { error: "unauthorized" });
  try { const r = await run(); return json(r.status, r.body); }
  catch (e) { return json(500, { error: String((e as Error)?.message || e).slice(0, 300) }); }
});

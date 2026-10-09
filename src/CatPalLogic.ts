// App state and behaviour (DCLogic port of the prototype), now backed by Supabase:
// anonymous users with a nickname + country share cat moments, like them, and
// write private Cat Letters. renderVals() returns the flat object every screen
// component renders from. Nothing here is simulated: no seeded pals, letters,
// replies or like counts.
import React from 'react';
import { DCLogic } from './dc/DCLogic';
import { I18N } from './i18n';
import { COMMUNITY_STRINGS } from './community/strings';
import { supabaseConfigured } from './community/supabase';
import * as api from './community/api';
import type { Letter, MomentCard, Profile, Thread } from './community/api';
import { countryName, countryOptions, distanceKm, flagOf, globePoint, guessCountry, POSTMARK_FILES, postmarkOf } from './community/countries';
import { dataUrlToBlob, toUploadJpeg } from './community/image';
import type { CatStampInput } from './solana/catStamp';

for (const l in COMMUNITY_STRINGS) I18N[l] = { ...(I18N[l] || {}), ...COMMUNITY_STRINGS[l] };

const STAMPS = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => "./assets/stamp-" + i + ".png");
const pad = (n) => String(n).padStart(2, "0");
/** "26-09-23", like the design's letter dates. */
const ymd = (iso) => { const d = new Date(iso); return String(d.getFullYear()).slice(2) + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const optCache: Record<string, { cc: string; label: string }[]> = {};

export default class CatPalLogic extends DCLogic {
  state: Record<string, any> = {
    screen: null, prev: "home", lang: null, langOpen: false, sheet: null, camErr: false,
    // auth
    authReady: false, me: null, onbNick: "", onbCountry: guessCountry(), onbBusy: false, onbErr: "",
    // feed
    feed: [], feedState: "idle", feedErr: "", top: [], likeFx: null,
    // share
    photoFor: null, shareCat: "my_cat", shareCaption: "", shareCatName: "", shareCountry: "", sharePhoto: null, shareBusy: false, shareErr: "", sharedFx: false,
    // letters
    threads: [], letters: [], urls: {}, mailReady: false, threadId: null, pendingMoment: null,
    draft: "", draftPhoto: null, stamp: 0, sending: false, sendErr: "", mbTab: "received",
    // delivery animation after a first letter
    dest: null, mapDone: false, sendCount: 0, isNewPal: false,
    // passport
    ppTab: "stamps", mine: [],
  };
  timers = [];
  I18N = I18N;

  componentDidMount() {
    this.boot();
    // Mail refresh: every 5 s while a thread is open, otherwise every 20 s (only when the tab is visible).
    this.poll = setInterval(() => {
      if (!this.state.me || document.visibilityState !== "visible") return;
      const every = this.cur === "letters" ? 5000 : 20000;
      if (Date.now() - (this.lastMail || 0) >= every) this.refreshMail();
    }, 2500);
    this.syncCam();
  }
  componentDidUpdate() {
    // Arrived screen moves on to the letter thread by itself after 3s (unless the user already left it).
    const was = this.lastScreen; this.lastScreen = this.state.screen;
    if (this.state.screen === "arrived" && was !== "arrived") {
      clearTimeout(this.arrT);
      this.arrT = setTimeout(() => { if (this.state.screen === "arrived") this.go("letters", { sheet: null }); }, 3000);
    }
    this.syncCam();
    const el = this.threadRef && this.threadRef.current;
    const n = this.state.letters.length + ":" + this.state.threadId;
    if (el && this.scrolledFor !== n) { this.scrolledFor = n; el.scrollTop = el.scrollHeight; }
  }
  componentWillUnmount() { this.stopCam(); clearTimeout(this.arrT); clearInterval(this.poll); this.timers.forEach(clearTimeout); }

  // ---------------------------------------------------------------- camera / photos (from the prototype)
  stopCam() { if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; } }
  syncCam() {
    if (this.cur !== "camera") { this.stopCam(); return; }
    const v = this.videoRef && this.videoRef.current;
    if (this.stream) { if (v && v.srcObject !== this.stream) { v.muted = true; v.srcObject = this.stream; v.play && v.play().catch(() => {}); } return; }
    if (this.camStarting || this.state.camErr) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { this.setState({ camErr: true }); return; }
    this.camStarting = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }).then((s) => {
      this.camStarting = false; this.stream = s;
      if (this.cur !== "camera") { this.stopCam(); return; }
      const vv = this.videoRef.current; if (vv) { vv.muted = true; vv.srcObject = s; vv.play && vv.play().catch(() => {}); }
    }).catch(() => { this.camStarting = false; this.setState({ camErr: true }); });
  }
  /** A photo was picked (album) or captured (camera). Blob URLs, since data: URLs break inline background:url(). */
  afterPhoto(blob: Blob | null) {
    if (!blob) { this.go(this.state.photoFor === "letter" ? "letters" : "share", { sheet: null }); return; }
    const url = URL.createObjectURL(blob);
    if (this.state.photoFor === "letter") {
      this.draftBlob = blob;
      this.setState({ draftPhoto: url, sheet: null, screen: "letters", sendErr: "" });
    } else {
      this.shareBlob = blob;
      this.setState({ sharePhoto: url, sheet: null, screen: "share", shareErr: "" });
    }
  }
  snap() {
    const v = this.videoRef && this.videoRef.current;
    if (this.stream && v && v.videoWidth) {
      const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext("2d").drawImage(v, 0, 0); this.stopCam(); this.afterPhoto(dataUrlToBlob(c.toDataURL("image/jpeg", .9)));
    } else this.afterPhoto(null);
  }
  go(screen, extra?) { this.setState((p) => ({ screen, prev: this.cur, langOpen: false, ...(extra || {}) })); }

  // ---------------------------------------------------------------- auth
  async boot() {
    if (!supabaseConfigured) { this.setState({ authReady: true, onbErr: "CatPal is missing its Supabase settings." }); return; }
    try {
      const uid = await api.currentUserId();
      const me = uid ? await api.getProfile(uid) : null;
      this.setState({ authReady: true, me });
      if (me) { if (!this.state.screen || this.state.screen === "intro") this.setState({ screen: "home" }); this.loadAll(); }
    } catch (e) {
      this.setState({ authReady: true, onbErr: api.errorText(e) });
    }
  }
  async join() {
    const s = this.state, nick = s.onbNick.trim(), cc = s.onbCountry;
    if (s.onbBusy) return;
    if (!nick) { this.setState({ onbErr: this.tx("onbNick") + " ?" }); return; }
    if (!cc) { this.setState({ onbErr: this.tx("onbPick") }); return; }
    this.setState({ onbBusy: true, onbErr: "" });
    try {
      const uid = (await api.currentUserId()) || (await api.signInAnonymously());
      const me = await api.saveProfile(uid, nick.slice(0, 24), cc);
      this.setState({ me, onbBusy: false, screen: "home", prev: "onboard" });
      this.loadAll();
    } catch (e) {
      this.setState({ onbBusy: false, onbErr: api.errorText(e) });
    }
  }

  // ---------------------------------------------------------------- feed & likes
  loadAll() { this.loadFeed(); this.loadTop(); this.refreshMail(); this.loadMine(); }
  async loadFeed() {
    this.setState({ feedState: "loading", feedErr: "" });
    try { const feed = await api.discoverFeed(30); this.setState({ feed, feedState: "ready" }); }
    catch (e) { this.setState({ feedState: "error", feedErr: api.errorText(e) }); }
  }
  async loadTop() { try { this.setState({ top: await api.topThisWeek(6) }); } catch (_) { /* secondary: stay hidden */ } }
  async loadMine() { const me = this.state.me; if (!me) return; try { this.setState({ mine: await api.myMoments(me.id) }); } catch (_) {} }
  patchMoment(id, fn) {
    const up = (list) => list.map((m) => (m.id === id ? fn(m) : m));
    this.setState((p) => ({ feed: up(p.feed), top: up(p.top), mine: up(p.mine) }));
  }
  async toggleLike(m: MomentCard) {
    const me = this.state.me; if (!me) return;
    const on = !m.liked_by_me;
    this.patchMoment(m.id, (x) => ({ ...x, liked_by_me: on, like_count: Math.max(0, x.like_count + (on ? 1 : -1)) }));
    this.setState((p) => ({ likeFx: on ? { id: m.id, n: ((p.likeFx && p.likeFx.n) || 0) + 1 } : null }));
    clearTimeout(this.likeT); this.likeT = setTimeout(() => this.setState((p) => ({ likeFx: p.likeFx ? { ...p.likeFx, id: null } : null })), 1500);
    try { await api.setLike(m.id, me.id, on); }
    catch (e) { this.patchMoment(m.id, (x) => ({ ...x, liked_by_me: !on, like_count: Math.max(0, x.like_count + (on ? -1 : 1)) })); }
  }

  // ---------------------------------------------------------------- share a moment
  openShare() {
    this.shareBlob = null;
    this.go("share", { sheet: null, shareCat: "my_cat", shareCaption: "", shareCatName: "", shareCountry: this.state.me?.country || "", sharePhoto: null, shareErr: "", shareBusy: false, sharedFx: false, photoFor: "moment" });
  }
  async postMoment() {
    const s = this.state, me = s.me, caption = s.shareCaption.trim(), catName = s.shareCatName.trim();
    if (s.shareBusy || !me) return;
    if (!this.shareBlob) { this.setState({ shareErr: this.tx("needPhoto") }); return; }
    if (!caption) { this.setState({ shareErr: this.tx("needCaption") }); return; }
    this.setState({ shareBusy: true, shareErr: "" });
    try {
      const photo = await toUploadJpeg(this.shareBlob);
      await api.createMoment(me.id, { category: s.shareCat, caption: caption.slice(0, 200), cat_name: catName ? catName.slice(0, 30) : null, country: s.shareCountry || me.country }, photo);
      this.shareBlob = null;
      this.setState({ shareBusy: false, sharedFx: true });
      this.loadMine();
      this.timers.push(setTimeout(() => { if (this.state.screen === "share") this.go("home", { sharedFx: false }); else this.setState({ sharedFx: false }); }, 2100));
    } catch (e) {
      this.setState({ shareBusy: false, shareErr: api.errorText(e) });
    }
  }
  async removeMine(m: MomentCard) {
    if (!window.confirm(this.tx("confirmDelete"))) return;
    try { await api.deleteMoment(m); this.setState((p) => ({ mine: p.mine.filter((x) => x.id !== m.id), feed: p.feed.filter((x) => x.id !== m.id), top: p.top.filter((x) => x.id !== m.id) })); }
    catch (e) { window.alert(api.errorText(e)); }
  }

  // ---------------------------------------------------------------- letters
  async refreshMail() {
    if (!this.state.me || this.mailBusy) return;
    this.mailBusy = true; this.lastMail = Date.now();
    try {
      const [threads, letters] = await Promise.all([api.listThreads(), api.listLetters()]);
      // Signed URLs for letter photos (re-signed every 50 min).
      const fresh = this.urlsAt && Date.now() - this.urlsAt < 50 * 60e3;
      const urls = fresh ? this.state.urls : {};
      const need = letters.map((l) => l.photo_path).filter((p) => p && !urls[p]);
      const got = need.length ? await api.letterPhotoUrls(need) : {};
      if (!fresh) this.urlsAt = Date.now();
      this.setState({ threads, letters, urls: { ...urls, ...got }, mailReady: true });
      this.markOpenThreadRead();
    } catch (_) { /* keep what we have; the next tick retries */ }
    finally { this.mailBusy = false; }
  }
  markOpenThreadRead() {
    const s = this.state, id = s.threadId, me = s.me;
    if (this.cur !== "letters" || !id || !me) return;
    if (!s.letters.some((l) => l.thread_id === id && l.sender_id !== me.id && !l.read_at)) return;
    const now = new Date().toISOString();
    this.setState((p) => ({ letters: p.letters.map((l) => (l.thread_id === id && l.sender_id !== me.id && !l.read_at ? { ...l, read_at: now } : l)) }));
    api.markThreadRead(id).catch(() => {});
  }
  openThread(id) {
    this.draftBlob = null;
    this.go("letters", { threadId: id, pendingMoment: null, draft: "", draftPhoto: null, sendErr: "", sheet: null, photoFor: "letter" });
    this.timers.push(setTimeout(() => this.markOpenThreadRead(), 0));
  }
  /** "Send a Cat Letter" on a moment: continue our thread about it, or start a new one on first send. */
  letterTo(m: MomentCard) {
    const me = this.state.me; if (!me || m.user_id === me.id) return;
    const t = this.state.threads.find((x) => x.moment_id === m.id && x.starter_id === me.id);
    if (t) { this.openThread(t.id); return; }
    this.draftBlob = null;
    this.go("letters", { threadId: null, pendingMoment: m, draft: "", draftPhoto: null, sendErr: "", sheet: null, photoFor: "letter" });
  }
  async sendLetter() {
    const s = this.state, me = s.me, text = s.draft.trim().slice(0, 500);
    if (!me || s.sending || (!text && !this.draftBlob)) return;
    this.setState({ sending: true, sendErr: "" });
    try {
      const photo = this.draftBlob ? await toUploadJpeg(this.draftBlob) : null;
      const pm = s.pendingMoment;
      const isNew = !s.threadId;
      const threadId = s.threadId || (await api.openThread(me.id, pm));
      const firstOfThread = isNew && !s.letters.some((l) => l.thread_id === threadId);
      const letter = await api.sendLetter(me.id, threadId, text || null, photo, s.stamp);
      const urls = letter.photo_path && s.draftPhoto ? { ...this.state.urls, [letter.photo_path]: s.draftPhoto } : this.state.urls;
      this.draftBlob = null;
      this.setState((p) => ({ letters: [...p.letters, letter], urls, draft: "", draftPhoto: null, sending: false, threadId, pendingMoment: null }));
      await this.refreshMail();
      if (firstOfThread && pm) this.playDelivery(pm);
    } catch (e) {
      this.setState({ sending: false, sendErr: api.errorText(e) });
    }
  }
  /** The prototype's globe flight + "arrived" card, now for a real first letter. */
  playDelivery(pm: MomentCard) {
    const me = this.state.me, to = pm.author_country;
    if (!globePoint(me.country) || !globePoint(to)) return; // no coordinates: just stay in the thread
    const isNew = !this.state.threads.some((t) => t.id !== this.state.threadId && this.otherOf(t).id === pm.user_id);
    this.setState({ dest: { cc: to, name: pm.nickname, uid: pm.user_id, photo: api.momentPhotoUrl(pm.photo_path) }, isNewPal: isNew, screen: "deliveryMap", prev: "letters", mapDone: false, sendCount: this.state.sendCount + 1, langOpen: false });
    this.timers.push(
      setTimeout(() => { if (this.state.screen === "deliveryMap") this.setState({ mapDone: true }); }, 7000),
      setTimeout(() => { if (this.state.screen === "deliveryMap") this.setState({ screen: "arrived", prev: "deliveryMap" }); }, 7600),
    );
  }
  otherOf(t: Thread): Profile { const me = this.state.me; return t.starter_id === me.id ? t.owner : t.starter; }

  tx(k, v?) {
    const L = this.L || "en", D = this.I18N[L] || this.I18N.en, DE = this.I18N.en;
    let s = D[k] ?? DE[k] ?? k; if (v) for (const n in v) s = s.split("{" + n + "}").join(String(v[n])); return s;
  }

  renderVals() {
    const st = this.state;
    const LANGS = [["en", "English", "en-US"], ["ko", "한국어", "ko-KR"], ["ja", "日本語", "ja-JP"], ["zh", "中文", "zh-CN"], ["es", "Español", "es-ES"], ["fr", "Français", "fr-FR"], ["de", "Deutsch", "de-DE"], ["pt", "Português", "pt-BR"], ["th", "ไทย", "th-TH"], ["id", "Bahasa Indonesia", "id-ID"]];
    const propLang = (LANGS.find((x) => x[1] === this.props.language) || LANGS[0])[0];
    const L = st.lang ?? propLang;
    this.L = L;
    const LOC = (LANGS.find((x) => x[0] === L) || LANGS[0])[2];
    const tx = (k, v?) => this.tx(k, v);
    const cName = (cc) => countryName(cc, LOC);
    const fmt = (n) => n.toLocaleString("en-US");
    const km = (a, b) => { const d = distanceKm(a, b); return d == null ? "" : fmt(d) + " km"; };
    const cur = st.screen ?? (st.me ? "home" : "intro");
    this.cur = cur;
    const me: Profile | null = st.me;
    const myName = me ? me.nickname : "";
    const myCC = me ? me.country : "";
    const photoOf = (m) => (m && m.photo_path ? api.momentPhotoUrl(m.photo_path) : "");

    // ---- letters, derived
    const letters: Letter[] = st.letters;
    const byThread: Record<string, Letter[]> = {};
    for (const l of letters) (byThread[l.thread_id] = byThread[l.thread_id] || []).push(l);
    const threads: Thread[] = me ? st.threads.filter((t) => byThread[t.id] || t.id === st.threadId) : [];
    const otherOf = (t) => (t.starter_id === me.id ? t.owner : t.starter);
    const unreadOf = (t) => (byThread[t.id] || []).filter((l) => l.sender_id !== me.id && !l.read_at).length;
    const unread = me ? letters.filter((l) => l.sender_id !== me.id && !l.read_at) : [];
    const threadById = Object.fromEntries(threads.map((t) => [t.id, t]));
    // People I've exchanged letters with, newest activity first.
    const pals: { p: Profile; threads: Thread[]; last: string; first: string; wroteMe: Letter | null; iWrote: boolean; n: number; photo: string }[] = [];
    for (const t of threads) {
      const o = otherOf(t), ls = byThread[t.id] || [];
      if (!ls.length) continue;
      let e = pals.find((x) => x.p.id === o.id);
      if (!e) pals.push((e = { p: o, threads: [], last: "", first: ls[0].created_at, wroteMe: null, iWrote: false, n: 0, photo: "" }));
      e.threads.push(t); e.n += ls.length;
      if (ls[ls.length - 1].created_at > e.last) e.last = ls[ls.length - 1].created_at;
      if (ls[0].created_at < e.first) e.first = ls[0].created_at;
      if (ls.some((l) => l.sender_id === me.id)) e.iWrote = true;
      for (const l of ls) if (l.sender_id !== me.id && l.read_at && (!e.wroteMe || l.created_at < e.wroteMe.created_at)) e.wroteMe = l;
      if (!e.photo && t.moment && t.moment.photo_path && t.owner_id === o.id) e.photo = photoOf(t.moment);
    }
    pals.sort((a, b) => (a.last < b.last ? 1 : -1));
    const latestThreadWith = (uid) => { const e = pals.find((x) => x.p.id === uid); if (!e) return null; return e.threads.slice().sort((a, b) => { const la = (byThread[a.id] || []).slice(-1)[0], lb = (byThread[b.id] || []).slice(-1)[0]; return (la?.created_at || "") < (lb?.created_at || "") ? 1 : -1; })[0]; };
    const palRows = pals.map((e) => ({
      id: e.p.id, slot: "pal-" + e.p.id, img: e.photo, name: e.p.nickname, flag: flagOf(e.p.country), city: cName(e.p.country), dist: km(myCC, e.p.country),
      meta: tx("palMeta", { n: e.n, since: new Intl.DateTimeFormat(LOC, { month: "short", day: "numeric" }).format(new Date(e.first)) }),
      open: () => { const t = latestThreadWith(e.p.id); t && this.openThread(t.id); },
      letters: (ev) => { ev && ev.stopPropagation && ev.stopPropagation(); const t = latestThreadWith(e.p.id); t && this.openThread(t.id); },
    }));

    // ---- current thread
    const thr = st.threadId ? threadById[st.threadId] || st.threads.find((t) => t.id === st.threadId) : null;
    const pending: MomentCard | null = st.pendingMoment;
    const lOther: Profile | null = thr && me ? otherOf(thr) : pending ? { id: pending.user_id, nickname: pending.nickname, country: pending.author_country } : null;
    const lMoment = thr ? thr.moment : pending;
    const lLetters = thr ? byThread[thr.id] || [] : [];

    // ---- feed cards
    const catLabel = (c) => (c === "met_cat" ? tx("metCat") : tx("myCat"));
    const card = (m: MomentCard, i: number) => {
      const own = !!me && m.user_id === me.id;
      const fx = st.likeFx && st.likeFx.id === m.id ? st.likeFx.n : 0;
      return {
        id: m.id, photo: photoOf(m), caption: m.caption, catName: m.cat_name || "", hasCatName: !!m.cat_name, cat: catLabel(m.category),
        who: m.nickname, whoFlag: flagOf(m.author_country), whoCountry: cName(m.author_country),
        where: m.country !== m.author_country ? flagOf(m.country) + " " + cName(m.country) : "", hasWhere: m.country !== m.author_country,
        pm: postmarkOf(m.author_country), stamp: STAMPS[(m.id.charCodeAt(0) + m.id.charCodeAt(1)) % 8],
        likes: m.like_count, liked: m.liked_by_me, likeLabel: tx("like"),
        heartAnim: fx ? "cp-rpop" + (fx % 2 ? "a" : "b") + " .45s cubic-bezier(.34,1.56,.64,1)" : "none",
        burst: fx && m.liked_by_me ? Array.from({ length: 5 }, (_, j) => ({ key: fx + "-" + j, anim: "cp-b" + j + (fx % 2 ? "a" : "b") + " 1.2s cubic-bezier(.2,.7,.3,1) " + j * 45 + "ms both" })) : [],
        like: () => this.toggleLike(m), canLetter: !!me && !own, letter: () => this.letterTo(m), own,
        rot: [-1.2, 0.8, -0.6, 1.1, -0.9, 0.5][i % 6], date: ymd(m.created_at),
      };
    };

    // ---- nav
    const backMap = { onboard: "intro", share: "home", camera: st.photoFor === "letter" ? "letters" : "share", letters: st.prev && !["letters", "camera", "arrived", "deliveryMap"].includes(st.prev) ? st.prev : "mailbox" };
    const navActive = { home: "home", mailbox: "mailbox", map: "map", passport: "passport" }[cur];
    const navItems = [
      { id: "home", label: tx("navHome"), icon: st.hmAnim ? (st.hmAnim % 2 ? "./assets/home.gif" : "./assets/home-b.gif") : "./assets/icon-home.png", iconH: st.hmAnim ? 62 : 44, iconMt: st.hmAnim ? -18 : 0 },
      { id: "mailbox", label: tx("navMailbox"), icon: st.mbAnim ? (st.mbAnim % 2 ? "./assets/mailbox.gif" : "./assets/mailbox-b.gif") : "./assets/mailbox-still.png", count: unread.length },
      { id: "map", label: tx("navMap"), icon: st.mpAnim ? (st.mpAnim % 2 ? "./assets/map.gif" : "./assets/map-b.gif") : "./assets/icon-map-160.png", iconH: st.mpAnim ? 54 : 44, iconMt: st.mpAnim ? -10 : 0 },
      { id: "passport", label: tx("navPassport"), icon: st.ppAnim ? (st.ppAnim % 2 ? "./assets/passport.gif" : "./assets/passport-b.gif") : "./assets/passport-still.png", iconW: 56, iconH: 50, iconMt: -6 },
    ].map((n) => ({ iconW: 44, iconH: 44, iconMt: 0, ...n, tap: () => {
        const t = Date.now();
        if (n.id === "home") { clearTimeout(this.hmT); this.hmT = setTimeout(() => this.setState({ hmAnim: null }), 3000); this.go(n.id, { sheet: null, hmAnim: t }); if (cur === "home") this.loadFeed(); }
        else if (n.id === "map") { clearTimeout(this.mpT); this.mpT = setTimeout(() => this.setState({ mpAnim: null }), 3000); this.go(n.id, { sheet: null, mpAnim: t }); }
        else if (n.id === "passport") { clearTimeout(this.ppT); this.ppT = setTimeout(() => this.setState({ ppAnim: null }), 3000); this.go(n.id, { sheet: null, ppAnim: t }); this.loadMine(); }
        else if (n.id === "mailbox") { clearTimeout(this.mbT); this.mbT = setTimeout(() => this.setState({ mbAnim: null }), 3000); this.go(n.id, { sheet: null, mbAnim: t, mbTab: "received" }); this.refreshMail(); }
      }, weight: navActive === n.id ? 700 : 500, color: navActive === n.id ? "#010002" : "#a89f8d", opacity: navActive === n.id || !navActive ? 1 : .55, badge: !!n.count }));

    // ---- mailbox cards
    const received = me ? letters.filter((l) => l.sender_id !== me.id).slice().reverse() : [];
    const sentL = me ? letters.filter((l) => l.sender_id === me.id).slice().reverse() : [];
    const mbCards = !me ? [] : (st.mbTab === "sent" ? sentL : received).filter((l) => threadById[l.thread_id]).map((l) => {
      const o = otherOf(threadById[l.thread_id]);
      return st.mbTab === "sent"
        ? { who: tx("toPrefix", { name: o.nickname }), place: flagOf(o.country) + " " + cName(o.country) + (km(myCC, o.country) ? " · " + km(myCC, o.country) : ""), date: ymd(l.created_at), stamp: STAMPS[l.stamp] || STAMPS[0], pm: postmarkOf(myCC), isNew: false, locked: false, open: () => this.openThread(l.thread_id) }
        : { who: tx("fromPrefix", { name: o.nickname }), place: flagOf(o.country) + " " + cName(o.country), date: ymd(l.created_at), stamp: STAMPS[l.stamp] || STAMPS[0], pm: postmarkOf(o.country), isNew: !l.read_at, locked: false, open: () => this.openThread(l.thread_id) };
    });
    const unreadThreads = threads.filter((t) => unreadOf(t) > 0).length;
    const tabDef = (id, label, extra?) => ({ label, bg: st.mbTab === id ? "#fff" : "transparent", color: st.mbTab === id ? "#010002" : "#a89f8d", shadow: st.mbTab === id ? "0 1px 3px rgba(0,0,0,.1)" : "none", tap: () => this.setState({ mbTab: id }), badge: false, count: 0, ...(extra || {}) });

    // ---- passport: one stamp per CatPal who has written to me (their first letter I opened)
    const stampPals = pals.filter((e) => e.wroteMe);
    const usedPm = new Set([postmarkOf(myCC), ...stampPals.map((e) => postmarkOf(e.p.country))]);
    const placeholders = POSTMARK_FILES.filter((f) => !usedPm.has(f)).slice(0, Math.max(0, 11 - stampPals.length));
    const stampBook = [
      { img: postmarkOf(myCC), label: myName, sub: cName(myCC) + " " + flagOf(myCC), owned: true, open: () => this.go("passport", { ppTab: "mine" }), catStamp: null },
      ...stampPals.map((e) => ({
        img: postmarkOf(e.p.country), label: e.p.nickname, sub: cName(e.p.country) + " " + flagOf(e.p.country), owned: true, open: () => { const t = latestThreadWith(e.p.id); t && this.openThread(t.id); },
        catStamp: { stampId: "catpal-letter-" + e.wroteMe.id, fromCountry: e.p.country, toCountry: myCC, date: e.wroteMe.created_at.slice(0, 10) } as CatStampInput,
      })),
      ...placeholders.map((img) => ({ img, label: "???", sub: tx("yetToMeet"), owned: false, open: () => this.go("home", { sheet: null }), catStamp: null })),
    ].map((s, i) => ({ ...s, locked: !s.owned, opacity: s.owned ? .9 : .13, filter: s.owned ? "none" : "grayscale(1)", rot: [-9, 6, -4, 11, -7, 3, -12, 8, -5, 10, -2, 7][i % 12], dy: [0, 8, -4, 6, -6, 4, 2, -8, 6, -2, 8, -4][i % 12] }));
    const palCountries = new Set(pals.map((e) => e.p.country)).size;

    // ---- journal: this month, real days
    const now = new Date(), Y = now.getFullYear(), M = now.getMonth();
    const inMonth = (iso) => { const d = new Date(iso); return d.getFullYear() === Y && d.getMonth() === M ? d.getDate() : 0; };
    const sentDays = new Set(sentL.map((l) => inMonth(l.created_at)));
    const recvDays = new Set(received.map((l) => inMonth(l.created_at)));
    const lead = new Date(Y, M, 1).getDay(), days = new Date(Y, M + 1, 0).getDate(), today = now.getDate();
    const calCells = [];
    for (let i = 0; i < lead; i++) calCells.push({ n: "", sent: false, recv: false, weight: 500, color: "#746e63" });
    for (let d = 1; d <= days; d++) calCells.push({ n: String(d), sent: sentDays.has(d), recv: recvDays.has(d), weight: d === today ? 800 : 500, color: d === today ? "#FF4800" : "#746e63" });
    while (calCells.length % 7) calCells.push({ n: "", sent: false, recv: false, weight: 500, color: "#746e63" });

    // ---- delivery
    const dest = st.dest;
    const destKm = dest && me ? distanceKm(myCC, dest.cc) : null;
    const sharePhoto = st.sharePhoto;
    const opts = optCache[LOC] || (optCache[LOC] = countryOptions(LOC));

    const t = {
      ...Object.fromEntries(["start", "album", "camera", "cancel", "camErr", "mapTitle", "tapContinue", "letters", "photoShort", "mailbox", "navHome", "received", "sent", "catpals", "stampBook", "journal", "countries", "stamps",
        "onbTitle", "onbSub", "onbNick", "onbNickPh", "onbCountry", "onbPick", "feedTitle", "shareMoment", "topCats", "aroundWorld", "moreCats", "findingCats", "noMoments", "myCat", "metCat", "shareTitle", "addPhoto", "changePhoto",
        "feedOnlyMine", "caption", "captionPh", "catName", "catNamePh", "where", "aboutMoment", "tapStamp", "noLetters", "myMoments", "noMyMoments", "deleteMoment", "retry", "sheetTitle"].map((k) => [k, tx(k)])),
      introTitle: tx("cIntroTitle"), introSub: tx("cIntroSub"),
      newTag: "NEW",
      onbGo: st.onbBusy ? tx("onbBusy") : tx("onbGo"),
      post: st.shareBusy ? tx("posting") : tx("post"), shared: tx("shared"),
      lettersWith: lOther ? tx("lettersWith", { name: lOther.nickname }) : "",
      letterCount: tx("letterCount", { n: lLetters.length, w: tx(lLetters.length === 1 ? "wLetter" : "wLetters") }),
      transit: lOther ? tx("transitSending", { city: cName(lOther.country) }) : "",
      toUpper: lOther ? "TO " + lOther.nickname.toUpperCase() : "",
      draftHint: lOther ? tx("draftHint", { name: lOther.nickname }) : "",
      reply: lLetters.length ? tx("reply") : tx("sendL"),
      sendLetter: tx("sendLetter"),
      mapSub: tx("cMapSub", { name: myName }), legendSent: tx("cLegendSent"), legendMet: tx("cLegendMet"),
      mapStats: tx("cMapStats", { c: palCountries, n: pals.length, l: letters.length, cw: tx(palCountries === 1 ? "wCountry" : "wCountries"), nw: tx(pals.length === 1 ? "wPal" : "wPals"), lw: tx(letters.length === 1 ? "wLetter" : "wLetters") }),
      passportTitle: tx("passportTitle", { name: myName }), passportSub: tx("cPassportSub"),
      month: new Intl.DateTimeFormat(LOC, { year: "numeric", month: "long" }).format(new Date(Y, M, 1)).toLocaleUpperCase(LOC),
      deliveryCard: dest ? (st.mapDone ? tx("cDelDone", { city: cName(dest.cc) }) : tx("cDelGoing", { city: cName(dest.cc) })) : "",
      toShort: dest ? dest.name : "",
      arr1: dest ? tx("cArr1", { name: myName, country: cName(dest.cc) }) + " " + flagOf(dest.cc) : "",
      newPalTitle: dest ? tx("newPal", { name: dest.name, city: cName(dest.cc) }) : "",
      stampCollected: tx("cStampNote"),
      fromLine: me ? cName(myCC) + " " + flagOf(myCC) + " · " + myName : "",
    };

    const myLatest = st.mine[0];
    return {
      t, myName,
      showLogo: cur !== "camera",
      sIntro: cur === "intro", sOnboard: cur === "onboard", sFeed: cur === "home", sShare: cur === "share", sCamera: cur === "camera",
      sDeliveryMap: cur === "deliveryMap", sArrived: cur === "arrived", sLetters: cur === "letters", sMailbox: cur === "mailbox", sMap: cur === "map", sPassport: cur === "passport",
      showNav: ["home", "mailbox", "map", "passport"].includes(cur),
      showBack: ["onboard", "share", "letters"].includes(cur),
      back: () => { this.stopCam(); this.go(backMap[cur] || "home", { sheet: null }); },
      navItems,
      goHome: () => this.go(me ? "home" : "onboard", { sheet: null }),
      authReady: st.authReady,

      // onboarding
      onbNick: st.onbNick, setOnbNick: (e) => this.setState({ onbNick: e.target.value.slice(0, 24), onbErr: "" }),
      onbCountry: st.onbCountry, setOnbCountry: (e) => this.setState({ onbCountry: e.target.value, onbErr: "" }),
      onbFlag: st.onbCountry ? flagOf(st.onbCountry) : "🌏", onbPm: st.onbCountry ? postmarkOf(st.onbCountry) : "./assets/pm/seoul.png",
      onbBusy: st.onbBusy, onbErr: st.onbErr, join: () => this.join(), countryOpts: opts,
      onbReady: !!st.onbNick.trim() && !!st.onbCountry && !st.onbBusy,

      // feed
      feedCards: st.feed.map(card), topCards: st.top.map(card), hasTop: st.top.length > 0,
      feedLoading: st.feedState === "loading" && !st.feed.length, feedError: st.feedState === "error" ? st.feedErr : "",
      feedEmpty: st.feedState === "ready" && !st.feed.length, feedEmptyText: st.mine.length ? tx("feedOnlyMine") : tx("noMoments"), moreCats: () => { this.loadFeed(); this.loadTop(); },
      openShare: () => this.openShare(),

      // share
      shareCats: [["my_cat", tx("myCat")], ["met_cat", tx("metCat")]].map(([id, label]) => ({ label, bg: st.shareCat === id ? "#fff" : "transparent", color: st.shareCat === id ? "#010002" : "#a89f8d", shadow: st.shareCat === id ? "0 1px 3px rgba(0,0,0,.1)" : "none", tap: () => this.setState({ shareCat: id }) })),
      sharePhoto: sharePhoto || "", hasSharePhoto: !!sharePhoto,
      shareCaption: st.shareCaption, setShareCaption: (e) => this.setState({ shareCaption: e.target.value.slice(0, 200), shareErr: "" }), captionCount: st.shareCaption.length,
      shareCatName: st.shareCatName, setShareCatName: (e) => this.setState({ shareCatName: e.target.value.slice(0, 30) }),
      shareCountry: st.shareCountry || myCC, setShareCountry: (e) => this.setState({ shareCountry: e.target.value }),
      shareErr: st.shareErr, shareBusy: st.shareBusy, sharedFx: st.sharedFx, postMoment: () => this.postMoment(),
      shareReady: !!sharePhoto && !!st.shareCaption.trim() && !st.shareBusy,

      // photo sheet + camera (prototype)
      sheetPhoto: st.sheet === "photo",
      closeSheet: () => this.setState({ sheet: null }),
      openPhotoSheet: () => this.setState({ sheet: "photo", photoFor: "moment" }),
      videoRef: this.videoRef || (this.videoRef = React.createRef()),
      albumRef: this.albumRef || (this.albumRef = React.createRef()),
      threadRef: this.threadRef || (this.threadRef = React.createRef()),
      pickAlbum: () => { this.setState({ sheet: null }); this.albumRef.current && this.albumRef.current.click(); },
      pickCamera: () => this.setState({ sheet: null, camErr: false, screen: "camera", prev: cur }),
      onAlbum: (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; this.stopCam(); this.afterPhoto(f); },
      camErr: !!st.camErr,
      capture: () => this.snap(),

      // letters (thread)
      lPal: lOther ? { city: cName(lOther.country), flag: flagOf(lOther.country), dist: km(myCC, lOther.country) || "—" } : {},
      lMoment: lMoment ? { photo: photoOf(lMoment), caption: lMoment.caption, catName: lMoment.cat_name || "", mine: !!thr && !!me && thr.owner_id === me.id } : null,
      thread: lLetters.map((l) => {
        const you = !!me && l.sender_id === me.id, photo = l.photo_path ? st.urls[l.photo_path] || "" : "";
        return { key: l.id, text: l.body || "", photo, hasPhoto: !!l.photo_path, them: !you, you, who: ((you ? "FROM " + myName : "FROM " + (lOther ? lOther.nickname : "")) + " · " + ymd(l.created_at)).toUpperCase(), stamp: STAMPS[l.stamp] || STAMPS[0] };
      }),
      draft: st.draft, setDraft: (e) => this.setState({ draft: e.target.value.slice(0, 500), sendErr: "" }), draftCount: st.draft.length,
      inTransit: st.sending, sendErr: st.sendErr,
      sendBg: (st.draft.trim() || st.draftPhoto) && !st.sending ? "#010002" : "#B9B2A4",
      draftPhoto: st.draftPhoto || "", hasDraftPhoto: !!st.draftPhoto, noDraftPhoto: !st.draftPhoto,
      replyPhotoRef: this.replyPhotoRef || (this.replyPhotoRef = React.createRef()),
      pickReplyPhoto: () => { this.setState({ photoFor: "letter" }); this.replyPhotoRef.current && this.replyPhotoRef.current.click(); },
      onReplyPhoto: (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) { this.setState({ photoFor: "letter" }); this.afterPhoto(f); } },
      clearReplyPhoto: () => { this.draftBlob = null; this.setState({ draftPhoto: null }); },
      sendLetter: () => this.sendLetter(),
      draftStamp: STAMPS[st.stamp], nextStamp: () => this.setState((p) => ({ stamp: (p.stamp + 1) % STAMPS.length })),

      // mailbox
      mbTabs: [tabDef("received", tx("received"), { badge: unreadThreads > 0, count: unread.length }), tabDef("sent", tx("sent")), tabDef("pals", tx("catpals"))],
      mbShowCards: st.mbTab !== "pals", mbShowPals: st.mbTab === "pals",
      mbCards, palRows,
      mbEmpty: st.mailReady && (st.mbTab === "pals" ? !palRows.length : !mbCards.length),

      // delivery + arrived (prototype animations)
      globeDeliverySrc: dest && me ? "./globe.html?mode=delivery&from=" + globePoint(myCC) + "&to=" + globePoint(dest.cc) + "&k=" + st.sendCount : "",
      mapDone: st.mapDone, destKm: destKm == null ? "" : fmt(destKm), destCity: dest ? cName(dest.cc) : "", arrFrom: cName(myCC),
      tapDeliveryCard: () => { if (this.state.mapDone) this.go("arrived"); },
      todayDate: ymd(new Date().toISOString()),
      isNewPal: st.isNewPal, destSlot: dest ? "pal-" + dest.uid : "", destImg: dest ? dest.photo : "", destStamp: STAMPS[st.stamp],
      openDestProfile: () => this.go("letters"),
      myPm: postmarkOf(myCC), stampMotif: STAMPS[st.stamp],

      // map
      globeMapSrc: "./globe.html?mode=map&from=" + globePoint(myCC || "KR")
        + "&sent=" + encodeURIComponent([...new Set(pals.filter((e) => e.iWrote).map((e) => globePoint(e.p.country)).filter(Boolean))].join(","))
        + "&recv=" + encodeURIComponent([...new Set(stampPals.map((e) => globePoint(e.p.country)).filter(Boolean))].join(",")),

      // passport
      openMe: () => this.go("passport", { ppTab: "mine" }),
      hasPhoto: !!myLatest, noPhoto: !myLatest, myPhoto: photoOf(myLatest),
      ppStats: [{ n: palCountries, l: tx("countries") }, { n: pals.length, l: tx("cCatsMet") }, { n: stampPals.length + 1, l: tx("stamps") }],
      ppTabs: [["stamps", tx("stampBook")], ["journal", tx("journal")], ["mine", tx("myMoments")]].map(([id, label]) => ({ label, bg: st.ppTab === id ? "#fff" : "transparent", color: st.ppTab === id ? "#010002" : "#a89f8d", shadow: st.ppTab === id ? "0 1px 3px rgba(0,0,0,.1)" : "none", tap: () => this.setState({ ppTab: id }) })),
      ppShowStamps: st.ppTab === "stamps", ppShowJournal: st.ppTab === "journal", ppShowMine: st.ppTab === "mine",
      stampBook,
      weekDays: [0, 1, 2, 3, 4, 5, 6].map((i) => new Intl.DateTimeFormat(LOC, { weekday: "narrow" }).format(new Date(2023, 0, 1 + i))),
      calCells,
      mineCards: st.mine.map((m) => ({ ...card(m, 0), remove: () => this.removeMine(m), likesText: tx("likes", { n: m.like_count }) })),
      noMine: !st.mine.length,

      // language (prototype)
      langOpen: !!st.langOpen,
      toggleLang: () => this.setState((p) => ({ langOpen: !p.langOpen })),
      closeLang: () => this.setState({ langOpen: false }),
      langCurrent: L.toUpperCase(),
      langCaret: st.langOpen ? "rotate(135deg) translate(-1px,-1px)" : "rotate(-45deg) translate(1px,-1px)",
      langOpts: LANGS.map(([id, label]) => ({ id, label })).map((o) => ({ ...o, bg: L === o.id ? "#F6F6F6" : "transparent", checkOpacity: L === o.id ? 1 : 0, pick: () => this.setState({ lang: o.id, langOpen: false }) })),
    };
  }
}

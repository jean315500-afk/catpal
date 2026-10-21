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
import { COUNTRY_COORDS, countryName, countryOptions, distanceKm, flagOf, globePoint, guessCountry, POSTMARK_COUNTRIES, POSTMARK_FILES, postmarkOf } from './community/countries';
import { dataUrlToBlob, toUploadJpeg } from './community/image';
import type { CatStampInput } from './solana/catStamp';

for (const l in COMMUNITY_STRINGS) I18N[l] = { ...(I18N[l] || {}), ...COMMUNITY_STRINGS[l] };

const STAMPS = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => "./assets/stamp-" + i + ".png");
const pad = (n) => String(n).padStart(2, "0");
/** "26-09-23", like the design's letter dates. */
const ymd = (iso) => { const d = new Date(iso); return String(d.getFullYear()).slice(2) + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const optCache: Record<string, { cc: string; label: string }[]> = {};
/** "5 minutes ago" in the UI language. */
function relTime(iso, LOC) {
  const d = (new Date(iso).getTime() - Date.now()) / 1000, f = new Intl.RelativeTimeFormat(LOC, { numeric: "auto" }), a = Math.abs(d);
  return a < 60 ? f.format(0, "second") : a < 3600 ? f.format(Math.round(d / 60), "minute") : a < 86400 ? f.format(Math.round(d / 3600), "hour") : a < 30 * 86400 ? f.format(Math.round(d / 86400), "day") : new Intl.DateTimeFormat(LOC, { month: "short", day: "numeric" }).format(new Date(iso));
}

// ---- the letter from Home: its draft (kept across reloads), the cat's name
const CP_KEYS = ["cpS1Title", "cpS1Sub", "cpAddPhoto", "cpPhotoSlot", "cpChangePhoto", "cpMsgPh", "cpContinue", "cpS2Title", "cpS2Sub", "cpCatName", "cpCatNamePh", "cpFrom", "cpPickCountry",
  "cpS3Title", "cpS3Sub", "cpEditLetter", "cpEditCat", "cpSend", "cpSending", "cpDear", "cpWaitTitle", "cpWaitSub", "cpTryAgain", "cpBackHome", "cpBack", "cpGuide"];
const DRAFT = "cp-letter-draft", CAT_NAME = "cp-cat-name", NICK_IS_CAT = "cp-nick-is-cat";
/** whether a letter is in progress (something on it), known without re-reading the stored photo on every render */
let draftStarted: boolean | null = null;
/** the delivery card's "To" spins through these while a cat pal is being found (then stops on theirs) */
const SPIN_CC = ["JP", "FR", "US", "GB", "IT", "AU", "CA", "TW", "TH", "SG", "ID", "BR", "DE", "ES", "MX", "IN", "NZ", "NL", "SE", "PH", "VN", "KR", "TR", "AR"];
/** "?mapSample=1": the Map as it looks once letters go back and forth — sample pals, labelled as a sample */
/** the letters whose flight the Map has already played (each plays once, then rests where it landed) */
const FLOWN = "cp-map-flown";
const flown = (): string[] => { try { return JSON.parse(localStorage.getItem(FLOWN) || "[]"); } catch { return []; } };
const markFlown = (id: string) => { try { localStorage.setItem(FLOWN, JSON.stringify([...flown().filter((x) => x !== id), id].slice(-20))); } catch { /* private mode */ } };
const MAP_SAMPLE = typeof location !== "undefined" && new URLSearchParams(location.search).has("mapSample");
/** "?ppSample=1" (or the Map's / Mailbox's sample): the Passport with sample stamps, labelled as a sample */
const PP_SAMPLE = typeof location !== "undefined" && ["ppSample", "mapSample", "mbSample"].some((k) => new URLSearchParams(location.search).has(k));
/** the sample pals: country, name, their cat, photo, letters you sent them, letters they sent you */
const SAMPLE_PALS: [string, string, string, number, number, number][] = [
  ["FR", "Léa", "Mochi", 1, 2, 2], ["JP", "Yuki", "Tora", 2, 0, 2], ["US", "Tom", "Biscuit", 3, 0, 1],
  ["AU", "Ava", "Pip", 4, 1, 1], ["TW", "Mei", "Doudou", 5, 1, 0], ["BR", "Rafa", "Feijão", 6, 1, 0],
];
const started = (d: any) => !!d && (!!d.photo || !!(d.text || "").trim());
function readDraft(): any {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(DRAFT) || "null"); } catch (_) { d = null; }
  d = d && typeof d === "object" && d.step ? d : null;
  draftStarted = started(d); return d;
}
const hasDraft = () => (draftStarted === null ? started(readDraft()) : draftStarted);
function writeDraft(c: any) {
  const { busy, err, ...keep } = c || {};
  draftStarted = started(keep);
  try { localStorage.setItem(DRAFT, JSON.stringify(keep)); }
  catch (_) { try { localStorage.setItem(DRAFT, JSON.stringify({ ...keep, photo: "" })); } catch (__) { /* storage off: it lives only in memory */ } }
}
function clearDraft() { draftStarted = false; try { localStorage.removeItem(DRAFT); } catch (_) {} }
/** what we know of your cat: its name as last used, else the name on your latest moment, else your profile's name */
function catInfo(me: Profile | null, mine: MomentCard[]) {
  let saved = ""; try { saved = localStorage.getItem(CAT_NAME) || ""; } catch (_) {}
  return { name: saved || (mine.find((m) => m.cat_name)?.cat_name ?? "") || (me ? me.nickname : "") };
}

export default class CatPalLogic extends DCLogic {
  state: Record<string, any> = {
    // the app opens on Home (the red envelope) — with or without "?start=home" from the landing page's Start button;
    // a first letter makes the profile as it's sent, so the old intro (nickname + country first) isn't needed up front
    screen: "home", prev: "home", lang: null, langOpen: false, sheet: null, camErr: false, introStep: 0,
    // auth
    authReady: false, me: null, onbNick: "", onbCountry: guessCountry(), onbBusy: false, onbErr: "",
    // feed
    feed: [], feedState: "idle", feedErr: "", top: [], likeFx: null, todayIdx: 0, openFx: null, mapMoments: [], cmSel: null, viewMoment: null, todayMode: false, pal: null, exTab: "latest", exSort: "top", exItems: { top: [], recent: [], ranking: [] }, exState: "idle", exCc: null, myPosts: [], draftPublic: false,
    // share
    photoFor: null, shareCat: "my_cat", shareCaption: "", shareCatName: "", shareCountry: "", sharePhoto: null, shareBusy: false, shareErr: "", sharedFx: false,
    // letters
    threads: [], letters: [], urls: {}, mailReady: false, threadId: null, pendingMoment: null,
    draft: "", draftPhoto: null, stamp: 0, sending: false, sendErr: "", mbTab: "received",
    // delivery animation after a first letter
    dest: null, mapDone: false, sendCount: 0, isNewPal: false,
    // passport
    ppTab: "stamps", mine: [],
    // the letter being written from Home (photo + hello → your cat → preview → off it goes); see openCompose
    cmp: null,
  };
  timers = [];
  I18N = I18N;

  componentDidMount() {
    // a letter was being written when the page was left: back to it, as it was
    const draft = readDraft();
    if (draft && draft.open && (!this.state.screen || this.state.screen === "home")) { this.setState({ screen: "compose", cmp: { ...draft, busy: false, err: "" } }); this.pushLetterStep(); }
    // the browser's back button steps back through the letter (and out of it to Home)
    this.onPop = () => {
      if (this.state.screen !== "compose") return;
      const c = this.state.cmp;
      if (c && !c.busy && c.step > 1) { this.cmpBack(); this.pushLetterStep(); } else if (!c || !c.busy) this.cmpClose(); else this.pushLetterStep();
    };
    addEventListener("popstate", this.onPop);
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
    // (the Arrived page, the letter's receipt, stays until you go on from it: to the Mailbox's Sent tab, or home)
    this.syncCam();
    const el = this.threadRef && this.threadRef.current;
    const n = this.state.letters.length + ":" + this.state.threadId;
    if (el && this.scrolledFor !== n) { this.scrolledFor = n; el.scrollTop = el.scrollHeight; }
  }
  componentWillUnmount() { removeEventListener("popstate", this.onPop); clearInterval(this.palSpin); this.stopCam(); clearTimeout(this.arrT); clearInterval(this.poll); this.timers.forEach(clearTimeout); }

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
    if (this.state.photoFor === "compose") { this.go("compose", { sheet: null }); if (blob) this.cmpPhoto(blob); return; }
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
      this.shareBlob = null;
      this.setState({ me, onbBusy: false, screen: "share", prev: "onboard", todayMode: true, photoFor: "moment", shareCat: "my_cat", shareCaption: "", shareCatName: "", shareCountry: me.country, sharePhoto: null, shareErr: "", sharedFx: false });
      this.loadAll();
    } catch (e) {
      this.setState({ onbBusy: false, onbErr: api.errorText(e) });
    }
  }

  // ---------------------------------------------------------------- feed & likes
  loadAll() { this.loadFeed(); this.loadTop(); this.refreshMail(); this.loadMine(); this.loadMap(); this.loadExplore(); this.loadMyPosts(); }
  async loadMap() { try { this.setState({ mapMoments: await api.mapMoments(300) }); } catch (_) { /* map stays as it was */ } }
  async loadFeed() {
    this.setState({ feedState: "loading", feedErr: "" });
    try { const feed = await api.discoverFeed(30); this.setState({ feed, feedState: "ready" }); }
    catch (e) { this.setState({ feedState: "error", feedErr: api.errorText(e) }); }
  }
  async loadTop() { try { this.setState({ top: await api.topThisWeek(6) }); } catch (_) { /* secondary: stay hidden */ } }
  async loadMine() { const me = this.state.me; if (!me) return; try { this.setState({ mine: await api.myMoments(me.id) }); } catch (_) {} }
  patchMoment(id, fn) {
    const up = (list) => list.map((m) => (m.id === id ? fn(m) : m));
    this.setState((p) => ({ feed: up(p.feed), top: up(p.top), mine: up(p.mine), mapMoments: up(p.mapMoments), viewMoment: p.viewMoment && p.viewMoment.id === id ? fn(p.viewMoment) : p.viewMoment }));
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
    this.go("share", { sheet: null, todayMode: false, shareCat: "my_cat", shareCaption: "", shareCatName: "", shareCountry: this.state.me?.country || "", sharePhoto: null, shareErr: "", shareBusy: false, sharedFx: false, photoFor: "moment" });
  }
  /** Home's upload polaroid: straight to the album/camera sheet; the picked photo opens the share form. */
  quickShare() {
    this.shareBlob = null;
    this.setState({ sheet: "photo", photoFor: "moment", todayMode: false, shareCat: "my_cat", shareCaption: "", shareCatName: "", shareCountry: this.state.me?.country || "", sharePhoto: null, shareErr: "", shareBusy: false, sharedFx: false, langOpen: false });
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
      this.timers.push(setTimeout(() => { if (this.state.screen === "share") this.go("home", { sharedFx: false, todayMode: false }); else this.setState({ sharedFx: false, todayMode: false }); }, 2100));
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
      let shareErr = "";
      if (s.draftPublic && photo) {
        try { await api.publishLetter(me.id, letter.id, photo); this.loadExplore(); this.loadMyPosts(); }
        catch (_) { shareErr = this.tx("xShareFail"); }
      }
      this.setState((p) => ({ letters: [...p.letters, letter], urls, draft: "", draftPhoto: null, sending: false, threadId, pendingMoment: null, draftPublic: false, sendErr: shareErr }));
      await this.refreshMail();
      // every letter gets the delivery: the running cat + globe flight, then "arrived"
      const th = this.state.threads.find((t) => t.id === threadId);
      const other = pm ? { id: pm.user_id, nickname: pm.nickname, country: pm.author_country } : th ? this.otherOf(th) : null;
      if (other) {
        const theirMoment = (this.state.mapMoments as MomentCard[]).find((m) => m.user_id === other.id);
        const photo = pm ? api.momentPhotoUrl(pm.photo_path) : th && th.moment && th.owner_id === other.id ? api.momentPhotoUrl(th.moment.photo_path) : theirMoment ? api.momentPhotoUrl(theirMoment.photo_path) : "";
        const newPal = firstOfThread && !this.state.threads.some((t) => t.id !== threadId && this.otherOf(t).id === other.id);
        this.playDelivery({ uid: other.id, name: other.nickname, cc: other.country, photo }, newPal);
      }
    } catch (e) {
      this.setState({ sending: false, sendErr: api.errorText(e) });
    }
  }
  /** The prototype's delivery: the cat runs along the bar while the letter flies over the globe, then "arrived". */
  playDelivery(to: { uid: string; name: string; cc: string; photo: string }, isNew: boolean) {
    const me = this.state.me;
    if (!globePoint(me.country) || !globePoint(to.cc)) return; // no coordinates: just stay in the thread
    const waiting = this.state.screen === "deliveryMap" && !this.state.dest;   // the map is already up (sent from the compose flow)
    this.setState({ dest: to, isNewPal: isNew, screen: "deliveryMap", prev: "letters", mapDone: false, sendCount: this.state.sendCount + (waiting ? 0 : 1), langOpen: false });
    this.timers.push(
      setTimeout(() => { if (this.state.screen === "deliveryMap") this.setState({ mapDone: true }); }, 7000),
      setTimeout(() => { if (this.state.screen === "deliveryMap") this.setState({ screen: "arrived", prev: "deliveryMap" }); }, 7600),
    );
  }
  /** "Open Letter": envelope-opening motion, then the letter (a thread, or a cat moment). */
  openToday() {
    const f = this.featured; if (!f || this.state.openFx) return;
    this.setState({ openFx: { phase: "opening", kind: f.kind, key: Date.now() } });
    this.timers.push(setTimeout(() => {
      if (!this.state.openFx) return;
      if (f.kind === "letter") { this.setState({ openFx: null }); this.openThread(f.threadId); }
      else this.setState((p) => ({ openFx: p.openFx && { ...p.openFx, phase: "open" } }));
    }, 1750));
  }
  // ---------------------------------------------------------------- cat map feed (public letters + moments)
  async loadExplore() {
    if (!this.state.me) return;
    this.setState({ exState: this.state.exItems.recent.length ? "ready" : "loading" });
    try {
      const [top, recent, ranking] = await Promise.all([api.exploreFeed("top" as any, 60), api.exploreFeed("recent", 100), api.exploreFeed("ranking", 10)]);
      this.setState({ exItems: { top, recent, ranking }, exState: "ready" });
    } catch (e) {
      this.setState({ exState: api.isMissingFeature(e) ? "missing" : "error" });
    }
  }
  async loadMyPosts() {
    const me = this.state.me; if (!me) return;
    api.getShowAsRecipient(me.id).then((on) => { if (on !== null && this.state.me) this.setState({ me: { ...this.state.me, show_as_recipient: on } }); });
    try { this.setState({ myPosts: await api.exploreFeed("recent", 100, true) }); } catch (_) { /* migration not applied yet */ }
  }
  patchFeed(kind, id, fn) {
    const up = (l) => l.map((x) => (x.kind === kind && x.id === id ? fn(x) : x));
    this.setState((p) => ({ exItems: { top: up(p.exItems.top), recent: up(p.exItems.recent), ranking: up(p.exItems.ranking) }, myPosts: up(p.myPosts) }));
  }
  async toggleFeedLike(it) {
    const me = this.state.me; if (!me) return;
    const on = !it.liked_by_me, d = on ? 1 : -1;
    const apply = (k) => (x) => ({ ...x, liked_by_me: k > 0 ? on : !on, like_count: Math.max(0, x.like_count + d * k), week_likes: Math.max(0, x.week_likes + d * k) });
    this.patchFeed(it.kind, it.id, apply(1));
    if (it.kind === "moment") this.patchMoment(it.id, (x) => ({ ...x, liked_by_me: on, like_count: Math.max(0, x.like_count + d) }));
    try { it.kind === "moment" ? await api.setLike(it.id, me.id, on) : await api.setPostLike(it.id, me.id, on); }
    catch (e) { this.patchFeed(it.kind, it.id, apply(-1)); }
  }
  async unshare(it) {
    if (!window.confirm(this.tx("pConfirmUnshare"))) return;
    try { await api.unpublishPost(it); this.setState((p) => ({ myPosts: p.myPosts.filter((x) => !(x.kind === "letter" && x.id === it.id)) })); this.loadExplore(); }
    catch (e) { window.alert(api.errorText(e)); }
  }
  async setShowName(on) {
    const me = this.state.me; if (!me) return;
    this.setState({ me: { ...me, show_as_recipient: on } });
    try { await api.setShowAsRecipient(me.id, on); } catch (e) { this.setState({ me: { ...me, show_as_recipient: !on } }); window.alert(api.errorText(e)); }
  }

  /** "Send a cat mail": the map shuffles through real cat lovers' countries and lands on one
   *  random moment from someone else (another country if possible); you then write to its owner. */
  findPal() {
    const me = this.state.me; if (!me) return;
    const pool = [...this.state.feed, ...this.state.mapMoments].filter((m, i, a) => m.user_id !== me.id && a.findIndex((x) => x.id === m.id) === i);
    if (!pool.length) { this.setState({ pal: { phase: "none", key: Date.now() } }); return; }
    const abroad = pool.filter((m) => m.author_country !== me.country);
    const list = abroad.length ? abroad : pool;
    const m = list[Math.floor(Math.random() * list.length)];
    const ccs = [...new Set(pool.map((x) => x.author_country))];  // only countries that have someone else's pin
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    clearInterval(this.palSpin);
    if (reduce || !ccs.length) { this.setState({ pal: { phase: "found", m, cc: m.author_country, key: Date.now() } }); return; }
    let n = 0;
    this.setState({ pal: { phase: "spin", cc: ccs[0], key: Date.now() } });
    this.palSpin = setInterval(() => {
      n++;
      if (n >= 20) { clearInterval(this.palSpin); this.setState({ pal: { phase: "found", m, cc: m.author_country, key: Date.now() } }); return; }
      this.setState((p) => ({ pal: p.pal && { ...p.pal, cc: ccs[(ccs.indexOf(p.pal.cc) + 1 + Math.floor(Math.random() * (ccs.length - 1))) % ccs.length] } }));
    }, 120 + n * 8);
  }
  // ---------------------------------------------------------------- the letter from Home
  // One letter, finished step by step: 1 your cat's photo + a hello (on the letter itself) → 2 your cat's name and
  // where it's sent from (first letter only) → 3 the finished letter, into the envelope → 4 off to a random real cat
  // lover abroad (the delivery globe), or, with nobody to match yet, it waits (nothing is sent). The draft is kept in
  // localStorage, so going back, leaving or reloading loses nothing. No account form: a first letter makes the
  // anonymous session and the profile (its name = your cat's name) only when it's sent.
  /** Home's envelope / button: on with the letter in progress, or a new one */
  openCompose() {
    const me = this.state.me, saved = readDraft();
    const cat = catInfo(me, this.state.mine);
    const cmp = saved && !saved.sent ? { ...saved, open: true, busy: false, err: "" }
      : { step: 1, text: "", photo: "", catName: cat.name, country: me?.country || guessCountry() || "", stamp: Math.floor(Math.random() * STAMPS.length), waiting: false, open: true, busy: false, err: "" };
    writeDraft(cmp);
    this.go("compose", { sheet: null, cmp });
    this.pushLetterStep();
  }
  /** a history entry for the letter, so the browser's back goes back a step instead of leaving the page */
  pushLetterStep() { try { if (!history.state || !history.state.cpLetter) history.pushState({ cpLetter: true }, ""); } catch (_) { /* no history API */ } }
  setCmp(patch) {
    const cmp = { ...this.state.cmp, ...patch };
    this.setState({ cmp }); writeDraft(cmp);
  }
  /** the photo goes on the letter (shrunk to a JPEG and kept as a data: URL, so the draft survives a reload) */
  async cmpPhoto(blob: Blob) {
    try {
      const jpeg = await toUploadJpeg(blob, 1080, 0.82);
      const photo = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(jpeg); });
      this.setCmp({ photo, err: "" });
    } catch (e) { this.setCmp({ err: api.errorText(e) }); }
  }
  /** a first letter asks for the cat's name and country; after that they're known (and can still be edited) */
  cmpKnowsCat() { return !!this.state.me && !!(this.state.cmp?.catName || "").trim(); }
  cmpNext() {
    const c = this.state.cmp; if (!c) return;
    if (c.step === 1) {
      if (!c.photo) { this.setCmp({ err: this.tx("cpNeedPhoto") }); return; }
      if (!c.text.trim()) { this.setCmp({ err: this.tx("cpNeedMsg") }); return; }
      this.setCmp({ step: this.cmpKnowsCat() && !c.editCat ? 3 : 2, err: "" });
    } else if (c.step === 2) {
      if (!c.catName.trim()) { this.setCmp({ err: this.tx("cpNeedName") }); return; }
      if (!c.country) { this.setCmp({ err: this.tx("cpNeedCountry") }); return; }
      this.setCmp({ step: 3, err: "", editCat: false });
    }
  }
  cmpBack() {
    const c = this.state.cmp; if (!c || c.busy) return;
    if (c.step === 1) { this.cmpClose(); return; }
    if (c.step === 4) { this.setCmp({ step: 3, err: "" }); return; }
    this.setCmp({ step: c.step === 3 && (this.cmpKnowsCat() && !c.editCat) ? 1 : c.step - 1, err: "" });
  }
  /** back to Home; the draft stays for next time */
  cmpClose() { const c = this.state.cmp; if (c) writeDraft({ ...c, open: false }); this.go("home", { sheet: null }); }
  async cmpSend() {
    const c = this.state.cmp;
    if (!c || c.busy || this.cmpSending) return;          // one letter, however many taps
    this.cmpSending = true;
    // the letter is already sealed in its envelope: off to the map at once, which waits over your country (the cat
    // running) while a cat pal is found and the letter goes out; then it flies (playDelivery)
    this.setState((p) => ({ cmp: p.cmp && { ...p.cmp, busy: true, err: "" }, dest: null, mapDone: false, sendCount: p.sendCount + 1, screen: "deliveryMap", prev: "compose", langOpen: false }));
    const back = (patch) => { this.setState((p) => ({ screen: "compose", cmp: p.cmp && { ...p.cmp, busy: false, ...patch } })); };
    try {
      const name = c.catName.trim().slice(0, 24), cc = c.country;
      // the session and the profile, made now if this is the first letter (the profile's name is the cat's)
      let me = this.state.me;
      const uid = me?.id || (await api.currentUserId()) || (await api.signInAnonymously());
      const nameIsCat = !me || localStorage.getItem(NICK_IS_CAT) === uid;
      if (!me || me.country !== cc || (nameIsCat && me.nickname !== name)) {
        me = await api.saveProfile(uid, nameIsCat ? name : me.nickname, cc);
        if (nameIsCat) try { localStorage.setItem(NICK_IS_CAT, uid); } catch (_) {}
        const first = !this.state.me;
        this.setState({ me: { ...(this.state.me || {}), ...me } });
        if (first) this.loadAll();
      }
      try { localStorage.setItem(CAT_NAME, name); } catch (_) {}
      // a random real cat lover: someone else's latest moments, abroad when there is anyone abroad
      await Promise.all([this.loadFeed(), this.loadMap()]);
      const pool = [...this.state.feed, ...this.state.mapMoments].filter((m, i, a) => m.user_id !== me.id && a.findIndex((x) => x.id === m.id) === i);
      if (!pool.length) { back({ step: 4, waiting: true }); return; }   // nobody yet: back to the sealed envelope, waiting, unsent
      const abroad = pool.filter((m) => m.author_country !== cc), list = abroad.length ? abroad : pool;
      const m = list[Math.floor(Math.random() * list.length)];
      // the letter itself goes through the usual letter sending (thread on their moment, photo upload, delivery)
      this.draftBlob = dataUrlToBlob(c.photo);
      this.setState({ pendingMoment: m, threadId: null, draft: c.text.trim().slice(0, 500), draftPhoto: c.photo, stamp: c.stamp || 0, draftPublic: false, sendErr: "" });
      await this.sendLetter();
      if (this.state.sendErr) { back({ err: this.state.sendErr }); return; }   // not sent: back to the envelope, to try again
      clearDraft();
      this.setState({ cmp: null });
      // sent but nowhere to fly (no coordinates for a country): straight to the Mailbox's Sent tab
      if (this.state.screen === "deliveryMap" && !this.state.dest) { this.go("mailbox", { sheet: null, mbTab: "sent" }); this.refreshMail(); }
    } catch (e) {
      back({ err: api.errorText(e) });
    } finally {
      this.cmpSending = false;
    }
  }
  /** Cat Map: open one moment as a letter (same envelope-opening motion). */
  openMoment(m: MomentCard) {
    this.setState({ viewMoment: m, openFx: { phase: "opening", kind: "moment", key: Date.now() } });
    this.timers.push(setTimeout(() => this.setState((p) => ({ openFx: p.openFx && { ...p.openFx, phase: "open" } })), 1750));
  }
  nextToday() {
    const n = this.state.feed.length; if (n < 2) return;
    this.setState((p) => ({ todayIdx: (p.todayIdx + 1) % n, openFx: { phase: "opening", kind: "moment", key: Date.now() } }));
    this.timers.push(setTimeout(() => this.setState((p) => ({ openFx: p.openFx && { ...p.openFx, phase: "open" } })), 1750));
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
    const cur = st.screen ?? "home";
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
    const backMap = { onboard: st.prev === "home" ? "home" : "intro", share: "home", catmap: st.prev === "explore" ? "explore" : "home", mailbox: st.prev === "passport" ? "passport" : "home", map: "passport", camera: st.photoFor === "compose" ? "compose" : st.photoFor === "letter" ? "letters" : st.sharePhoto ? "share" : "home", letters: st.prev && !["letters", "camera", "arrived", "deliveryMap"].includes(st.prev) ? st.prev : "mailbox" };
    // Home (send a letter) · Map (the globe, countries, the feed and its Top 10) · Mailbox (letters) · My Cat (profile, stamps, records)
    const navActive = { home: "home", catmap: "world", explore: "world", mailbox: "mailbox", passport: "mycat", map: "mycat" }[cur];
    const tabs = [
      { id: "home", label: tx("navHome"), tap: () => { this.go("home", { sheet: null }); if (cur === "home") { this.loadFeed(); this.loadMap(); } } },
      { id: "world", label: tx("navWorld"), tap: () => { this.go("catmap", { sheet: null, cmSel: null }); this.loadMap(); this.loadExplore(); } },
      { id: "mailbox", label: tx("navMailbox"), count: unread.length, tap: () => { this.go("mailbox", { sheet: null, mbTab: "received" }); this.refreshMail(); } },
      { id: "mycat", label: tx("navMyCat"), tap: () => { this.go("passport", { sheet: null }); this.loadMine(); this.refreshMail(); this.loadMyPosts(); } },
    ].map((n) => ({ ...n, on: navActive === n.id, badge: !!n.count }));
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
      }, weight: navActive === n.id ? 700 : 500, color: navActive === n.id ? "#22304A" : "#a89f8d", opacity: navActive === n.id || !navActive ? 1 : .55, badge: !!n.count }));

    // ---- mailbox cards
    const received = me ? letters.filter((l) => l.sender_id !== me.id).slice().reverse() : [];
    const sentL = me ? letters.filter((l) => l.sender_id === me.id).slice().reverse() : [];
    const mbCards = !me ? [] : (st.mbTab === "sent" ? sentL : received).filter((l) => threadById[l.thread_id]).map((l) => {
      const o = otherOf(threadById[l.thread_id]);
      return st.mbTab === "sent"
        ? { who: tx("toPrefix", { name: o.nickname }), place: flagOf(o.country) + " " + cName(o.country) + (km(myCC, o.country) ? " · " + km(myCC, o.country) : ""), date: ymd(l.created_at), stamp: STAMPS[l.stamp] || STAMPS[0], pm: postmarkOf(myCC), isNew: false, locked: false, open: () => this.openThread(l.thread_id) }
        : { who: tx("fromPrefix", { name: o.nickname }), place: flagOf(o.country) + " " + cName(o.country), date: ymd(l.created_at), stamp: STAMPS[l.stamp] || STAMPS[0], pm: postmarkOf(o.country), isNew: !l.read_at, locked: false, open: () => this.openThread(l.thread_id) };
    });
    // ---- the Mailbox (MailboxScreen): received letters as envelopes, sent ones as postcards, CatPals as an address book
    const shortDate = (iso) => new Intl.DateTimeFormat(LOC, { month: "short", day: "numeric" }).format(new Date(iso));
    const latestMomentOf = (uid) => photoOf((st.mapMoments as MomentCard[]).find((m) => m.user_id === uid) || st.feed.find((m: MomentCard) => m.user_id === uid));
    const mailOf = (l: Letter, mine: boolean) => {
      const th = threadById[l.thread_id], o = otherOf(th), lp = l.photo_path ? st.urls[l.photo_path] || "" : "";
      return {
        key: l.id, name: o.nickname, flag: flagOf(o.country), country: cName(o.country), date: shortDate(l.created_at),
        photo: lp || (mine ? photoOf(st.mine[0]) : latestMomentOf(o.id)) || (th.moment && th.owner_id === o.id ? photoOf(th.moment) : ""),
        stamp: STAMPS[l.stamp] || STAMPS[0], pm: postmarkOf(mine ? myCC : o.country),
        isNew: !mine && !l.read_at, status: mine ? (l.read_at ? "read" : "delivered") : "", statusLabel: mine ? tx(l.read_at ? "stRead" : "stDelivered") : "",
        open: () => this.openThread(l.thread_id),
      };
    };
    const mbReceived = me ? received.filter((l) => threadById[l.thread_id]).map((l) => mailOf(l, false)) : [];
    const mbSent = me ? sentL.filter((l) => threadById[l.thread_id]).map((l) => mailOf(l, true)) : [];
    const mbPals = pals.map((e, i) => ({ ...palRows[i], country: cName(e.p.country), n: e.n, lettersLabel: tx("mbLetters", { n: e.n, w: tx(e.n === 1 ? "wLetter" : "wLetters") }), pm: postmarkOf(e.p.country), photo: e.photo || latestMomentOf(e.p.id) }));
    const unreadThreads = threads.filter((t) => unreadOf(t) > 0).length;
    const tabDef = (id, label, extra?) => ({ label, bg: st.mbTab === id ? "#fff" : "transparent", color: st.mbTab === id ? "#22304A" : "#a89f8d", shadow: st.mbTab === id ? "0 1px 3px rgba(0,0,0,.1)" : "none", tap: () => this.setState({ mbTab: id }), badge: false, count: 0, ...(extra || {}) });

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

    // ---- the passport's stamp page: the countries with a postmark of their own; a country's stamp is yours once a
    // CatPal from there has written to you (the first letter you opened). Your own country is in the folder, not here.
    const ppBook = (() => {
      const sample = PP_SAMPLE && !stampPals.length;
      const got = new Map<string, { iso: string; from: string; n: number; open: (() => void) | null }>();
      if (sample) SAMPLE_PALS.forEach(([cc, who, , , s2, r2], i) => { if (r2) got.set(cc, { iso: new Date(Date.now() - (i * 4 + 1) * 86400000).toISOString(), from: who, n: s2 + r2, open: null }); });
      else for (const e of stampPals) if (!got.has(e.p.country)) { const t = latestThreadWith(e.p.id); got.set(e.p.country, { iso: e.wroteMe.created_at, from: e.p.nickname, n: e.n, open: t ? () => this.openThread(t.id) : null }); }
      // only the countries with a postmark of their own (the stamp images made for the app)
      const all = POSTMARK_COUNTRIES.filter((cc) => cc !== (myCC || (sample ? "KR" : "")) || got.has(cc));
      const stamps = all.map((cc, i) => { const g = got.get(cc); return { cc, name: cName(cc), en: countryName(cc).toUpperCase(), img: postmarkOf(cc),
        got: !!g, iso: g?.iso || "", from: g?.from || "", n: g?.n || 0, open: g?.open || null, rot: [-8, 6, -3, 10, -6, 4, -11, 7, -4, 9, -2, 5][i % 12] }; })
        .sort((a, b) => Number(b.got) - Number(a.got));
      const n = stamps.filter((x) => x.got).length, countries = sample ? SAMPLE_PALS.length : palCountries, palsN = sample ? SAMPLE_PALS.length : pals.length;
      return {
        ppSample: sample, ppStamps: stamps, ppGot: n, ppTotal: stamps.length,
        ppCounts: [{ n: countries, l: tx("ppCountries") }, { n: palsN, l: tx("ppPals") }, { n, l: tx("ppStamps") }],
        ppProgress: tx("ppProgress", { n, total: stamps.length }), ppCollected: tx("ppCollected", { n: String(n).padStart(2, "0"), total: String(stamps.length).padStart(2, "0") }),
      };
    })();

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

    // ---- home: today's cat mail (newest unread letter, else a real moment from someone far away)
    const newestUnread = unread.length ? unread[unread.length - 1] : null;
    let featured = null;
    if (me && newestUnread && threadById[newestUnread.thread_id]) {
      const th = threadById[newestUnread.thread_id], o = otherOf(th), l = newestUnread;
      featured = { kind: "letter", id: l.id, threadId: th.id, who: o.nickname, cc: o.country, photo: (l.photo_path && st.urls[l.photo_path]) || photoOf(th.moment),
        text: l.body || tx("hPhotoOnly"), catName: (th.moment && th.moment.cat_name) || "", stamp: STAMPS[l.stamp] || STAMPS[0], date: l.created_at, isNew: true, label: tx("hNewLetter") };
    } else if (st.feed.length) {
      const m = st.feed[st.todayIdx % st.feed.length], c = card(m, 0);
      featured = { kind: "moment", id: m.id, who: m.nickname, cc: m.author_country, photo: c.photo, text: m.caption, catName: m.cat_name || "", stamp: c.stamp, date: m.created_at, isNew: false, label: c.cat,
        likes: c.likes, liked: c.liked, like: c.like, heartAnim: c.heartAnim, burst: c.burst, likeLabel: c.likeLabel, letter: c.letter, canLetter: c.canLetter, more: st.feed.length > 1 };
    }
    this.featured = featured;
    const fmtDay = (iso) => new Intl.DateTimeFormat(LOC, { month: "short", day: "numeric" }).format(new Date(iso)).toUpperCase();
    const homeFeatured = featured && { ...featured, flag: flagOf(featured.cc), country: cName(featured.cc), pm: postmarkOf(featured.cc), day: fmtDay(featured.date) };
    const jKm = featured && me ? distanceKm(featured.cc, myCC) : null;
    const journey = featured && me && featured.cc !== myCC && jKm ? { from: cName(featured.cc), fromFlag: flagOf(featured.cc), to: cName(myCC), toFlag: flagOf(myCC), km: tx("hAbout", { km: fmt(jKm) + " km" }) } : null;
    // recent letters: the latest letter of each thread
    const lastByThread = threads.map((th) => ({ th, l: (byThread[th.id] || []).slice(-1)[0] })).filter((x) => x.l).sort((a, b) => (a.l.created_at < b.l.created_at ? 1 : -1)).slice(0, 10);
    const STATUS = { new: ["stNew", "#C9785D", "#fff"], received: ["stReceived", "#E4EADF", "#55684F"], delivered: ["stDelivered", "#E3EAF1", "#4F6A82"], read: ["stRead", "#EFE5DA", "#7A5A43"] };
    const recentLetters = lastByThread.map(({ th, l }, i) => {
      const o = otherOf(th), mine = l.sender_id === me.id;
      const s = STATUS[mine ? (l.read_at ? "read" : "delivered") : (l.read_at ? "received" : "new")];
      return { key: th.id, photo: (l.photo_path && st.urls[l.photo_path]) || photoOf(th.moment), who: (mine ? "To. " : "From. ") + o.nickname, flag: flagOf(o.country), country: cName(o.country),
        status: tx(s[0]), stBg: s[1], stColor: s[2], stDot: { stNew: "#C9785D", stReceived: "#9DB09A", stDelivered: "#7D9BB5", stRead: "#7A5A43" }[s[0]], open: () => this.openThread(th.id), delay: i * 60 + "ms" };
    });

    const t = {
      ...Object.fromEntries(["start", "upload", "album", "camera", "cancel", "camErr", "mapTitle", "tapContinue", "letters", "photoShort", "mailbox", "navHome", "received", "sent", "catpals", "stampBook", "journal", "countries", "stamps",
        "cmTitle", "cmHint", "cmYou", "fTitle", "fSub", "fWeekTitle", "xTitle", "xSub", "xTop", "xTopNone", "xFeed", "xEmpty", "xMissing", "xShare", "xShareHint", "pPublic", "pNoPublic", "pUnshare", "pLikesGot", "pCountriesEx", "pLetterLog", "pShowName", "pShowNameSub", "xAll", "obTitle", "obDesc", "obTitle3", "obDesc3", "obDear", "obNote", "obFrom", "obFromAt", "obTo", "obToAt", "tcTitle", "tcSub", "tcSkip", "tcNotePh", "tcSend", "tcPick", "mtTitle", "mtSent", "mtRecv", "mtCta", "mtSpin", "mtFound", "mtWrite", "mtAnother", "mtNone", "gmTitle", "gmMore", "exTitle", "exSub", "exMap", "exEmpty", "pfLettersLink", "pfMapLink", "introS1", "introS2", "introGo", "hOpenShort", "hNewChip", "hUploadToday", "hYourMail", "hViewAll", "hHead", "hSub", "hToday", "hFrom", "hOpen", "hJourney", "hSendHead", "hSendSub", "hSendCta", "hRecent", "hSeeAll", "hNoRecent", "hNoMail", "hNoMailSub", "hWaiting", "oWriteBack", "oAnother", "oClose", "oDear", "onbTitle", "onbSub", "onbNick", "onbNickPh", "onbCountry", "onbPick", "feedTitle", "shareMoment", "topCats", "aroundWorld", "moreCats", "findingCats", "noMoments", "myCat", "metCat", "shareTitle", "addPhoto", "changePhoto",
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

    // ---- cat map: moments grouped by the country they were shared from
    const cmMap: Record<string, any> = {};
    for (const m of st.mapMoments as MomentCard[]) {
      const xy = COUNTRY_COORDS[m.country]; if (!xy) continue;
      const g = cmMap[m.country] || (cmMap[m.country] = { cc: m.country, lon: xy[0], lat: xy[1], flag: flagOf(m.country), name: cName(m.country), items: [] });
      g.items.push(m);
    }
    const cmGroups = Object.values(cmMap).map((g: any) => ({ ...g, count: g.items.length, photo: photoOf(g.items[0]), countText: tx("cmCount", { n: g.items.length, nw: tx(g.items.length === 1 ? "wMoment" : "wMoments") }) }))
      .sort((a: any, b: any) => b.count - a.count);
    const cmSelGroup: any = st.cmSel ? cmGroups.find((g: any) => g.cc === st.cmSel) : null;
    const momentView = (m: MomentCard) => { const c = card(m, 0); return { kind: "moment", id: m.id, who: m.nickname, cc: m.author_country, photo: c.photo, text: m.caption, catName: m.cat_name || "", stamp: c.stamp, date: m.created_at, isNew: false, label: c.cat,
      likes: c.likes, liked: c.liked, like: c.like, heartAnim: c.heartAnim, burst: c.burst, likeLabel: c.likeLabel, letter: c.letter, canLetter: c.canLetter, more: false,
      flag: flagOf(m.author_country), country: cName(m.author_country), pm: postmarkOf(m.author_country), day: fmtDay(m.created_at) }; };
    const openCard = st.viewMoment ? momentView(st.viewMoment) : homeFeatured;

    // ---- home (redesign): mailbox, meet a new cat pal, global cat moments; explore
    const mini = (m: MomentCard) => ({ id: m.id, photo: photoOf(m), who: m.nickname, whoFlag: flagOf(m.author_country), country: cName(m.author_country), caption: m.caption, likes: m.like_count, liked: m.liked_by_me,
      mine: !!me && m.user_id === me.id, like: () => this.toggleLike(m), open: () => this.openMoment(m) });
    const byPopular = (st.mapMoments as MomentCard[]).slice().sort((a, b) => b.like_count - a.like_count || (a.created_at < b.created_at ? 1 : -1));
    const pal = st.pal, palM: MomentCard | null = pal && pal.m;
    // ---- cat map tab: public letters + moments, filterable by country
    const asMoment = (it): MomentCard => ({ id: it.id, user_id: it.author_id, category: "my_cat", photo_path: it.photo_path, caption: it.message || "", cat_name: it.cat_name, country: it.author_country, created_at: it.created_at,
      nickname: it.author_nickname, author_country: it.author_country, like_count: it.like_count, liked_by_me: it.liked_by_me });
    const fview = (it, i?) => ({
      key: it.kind + it.id, kind: it.kind, isLetter: it.kind === "letter", photo: api.feedPhotoUrl(it), cc: it.author_country,
      from: it.author_nickname, fromFlag: flagOf(it.author_country), fromCountry: cName(it.author_country),
      to: it.kind === "moment" ? tx("xToWorld") : it.recipient_nickname || tx("xToPal"), toFlag: it.kind === "moment" ? "🌍" : it.recipient_country ? flagOf(it.recipient_country) : "✉️",
      toCountry: it.recipient_country ? cName(it.recipient_country) : "", toShort: it.kind === "moment" ? tx("xToAll") : it.recipient_country ? cName(it.recipient_country) : it.recipient_nickname || tx("xToPal"),
      // the profile row: who → who, each with their country above, and how far it flew (letters; a moment goes to everyone)
      fromPlace: flagOf(it.author_country) + " " + cName(it.author_country),
      toPlace: it.kind === "moment" ? "🌍 " + tx("xToAll") : it.recipient_country ? flagOf(it.recipient_country) + " " + cName(it.recipient_country) : "✉️",
      toName: it.kind === "moment" ? tx("xToEveryone") : it.recipient_nickname || tx("xToPal"),
      kmText: it.kind !== "moment" && it.recipient_country && distanceKm(it.author_country, it.recipient_country) ? fmt(distanceKm(it.author_country, it.recipient_country)) + " km" : "",
      message: it.message || "", catName: it.cat_name || "", time: relTime(it.created_at, LOC), likes: it.like_count, week: it.week_likes, weekText: tx("xWeek", { n: it.week_likes }),
      liked: it.liked_by_me, like: it._m ? () => this.toggleLike(it._m) : () => this.toggleFeedLike(it), mine: !!me && it.author_id === me.id, rank: (i ?? 0) + 1,
      open: it._m ? () => this.openMoment(it._m) : it.kind === "moment" ? () => this.openMoment(asMoment(it)) : null, unshare: it.kind === "letter" ? () => this.unshare(it) : null,
    });
    const exAll = st.exItems.recent;
    const exG: Record<string, any> = {};
    for (const it of exAll) { const xy = COUNTRY_COORDS[it.author_country]; if (!xy) continue; const g = exG[it.author_country] || (exG[it.author_country] = { cc: it.author_country, lon: xy[0], lat: xy[1], count: 0, photo: api.feedPhotoUrl(it) }); g.count++; }
    const byCc = (l) => (st.exCc ? l.filter((x) => x.author_country === st.exCc) : l);
    // the feed without the server's explore feed (not deployed yet): the cat moments the app already has, as feed items
    // (no public letters until then); "this week" = moments posted in the last 7 days, by their hearts
    const exFallback = st.exState === "missing" && (st.mapMoments as MomentCard[]).length ? (() => {
      const items = (st.mapMoments as MomentCard[]).map((m) => ({ kind: "moment", id: m.id, bucket: "moments", photo_path: m.photo_path, author_id: m.user_id, author_nickname: m.nickname, author_country: m.author_country,
        message: m.caption, cat_name: m.cat_name, created_at: m.created_at, like_count: m.like_count, liked_by_me: m.liked_by_me, week_likes: m.like_count, recipient_nickname: null, recipient_country: null, _m: m }));
      const newest = (a, b) => (a.created_at < b.created_at ? 1 : -1), weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
      return { top: items.slice().sort((a, b) => b.like_count - a.like_count || newest(a, b)), recent: items.slice().sort(newest), ranking: items.filter((x) => x.created_at >= weekAgo && x.like_count > 0).sort((a, b) => b.like_count - a.like_count || newest(a, b)).slice(0, 10) };
    })() : null;
    const exList = (exFallback || st.exItems)[st.exSort] || [];
    const exPage = {
      exSorts: [["top", tx("xPopular")], ["recent", tx("xRecent")], ["ranking", tx("fWeek")]].map(([id, label]) => ({ id, label, on: st.exSort === id, tap: () => this.setState({ exSort: id }) })),
      exSort: st.exSort, exState: exFallback ? "ready" : st.exState, exGroups: Object.values(exG), exCc: st.exCc,
      exCcLabel: st.exCc ? flagOf(st.exCc) + " " + cName(st.exCc) : tx("xAll"), exClearCc: () => this.setState({ exCc: null }),
      exSelect: (cc) => this.setState((p) => ({ exCc: p.exCc === cc ? null : cc })),
      exTop: st.exItems.ranking.slice(0, 3).map(fview), exList: byCc(exList).map(fview), exRefresh: () => this.loadExplore(),
      // profile
      myPublic: st.myPosts.filter((x) => x.kind === "letter").map(fview),
      likesGot: st.myPosts.reduce((a, x) => a + x.like_count, 0),
      exchangedCountries: [...new Set(pals.map((e) => e.p.country))].map((cc) => ({ cc, flag: flagOf(cc), name: cName(cc) })),
      showName: !!(me && me.show_as_recipient), toggleShowName: () => this.setShowName(!(me && me.show_as_recipient)),
    };
    // ---- active cat lovers on the home map: one pin per person who shared a moment or a public
    // letter in the last 30 days (latest photo). Pins sit near their country's capital with a
    // small per-person offset so neighbours don't stack — never a real location.
    const actMap: Record<string, any> = {};
    const nowMs = Date.now();
    const touch = (uid, cc, iso, photo) => {
      if (!uid || (me && uid === me.id) || !COUNTRY_COORDS[cc]) return;
      const t = new Date(iso).getTime(); if (nowMs - t > 30 * 864e5) return;
      const a = actMap[uid]; if (!a || t > a.t) actMap[uid] = { uid, cc, t, photo };
    };
    for (const m of st.mapMoments as MomentCard[]) touch(m.user_id, m.author_country, m.created_at, photoOf(m));
    for (const it of st.exItems.recent) touch(it.author_id, it.author_country, it.created_at, api.feedPhotoUrl(it));
    const hash = (str, k) => { let h = k; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return (h % 1000) / 1000 - .5; };
    // my CatPals are always on the map (teal ring); other active cat lovers join them (white ring)
    const latestPhotoOf = (uid) => { const m = (st.mapMoments as MomentCard[]).find((x) => x.user_id === uid); return m ? photoOf(m) : ""; };
    const pinAt = (uid, cc) => ({ lon: COUNTRY_COORDS[cc][0] + hash(uid, 7) * 5, lat: COUNTRY_COORDS[cc][1] + hash(uid, 13) * 3.5 });
    const palPins = pals.filter((e) => COUNTRY_COORDS[e.p.country]).map((e) => ({ id: e.p.id, cc: e.p.country, count: 1, kind: "pal", photo: (actMap[e.p.id] && actMap[e.p.id].photo) || e.photo || latestPhotoOf(e.p.id), ...pinAt(e.p.id, e.p.country) }));
    const palIds = new Set(palPins.map((x) => x.id));
    const activePins = [...palPins, ...Object.values(actMap).filter((a: any) => !palIds.has(a.uid)).map((a: any) => ({ id: a.uid, cc: a.cc, count: 1, kind: "active", photo: a.photo, ...pinAt(a.uid, a.cc) }))];
    const activeWeek = Object.values(actMap).filter((a: any) => nowMs - a.t <= 7 * 864e5);
    const activeCountries = new Set(activeWeek.map((a: any) => a.cc)).size;
    const draftOpen = st.cmp ? started(st.cmp) : hasDraft();
    const home2 = {
      activePins,
      mtActive: !activePins.length ? tx("mtEmpty") : activeWeek.length ? tx("mtActive", { n: activeWeek.length, lw: tx(activeWeek.length === 1 ? "wLover" : "wLovers"), c: activeCountries, cw: tx(activeCountries === 1 ? "wCountry" : "wCountries") }) : tx("mtSub", { c: new Set(activePins.map((x) => x.cc)).size, cw: tx(new Set(activePins.map((x) => x.cc)).size === 1 ? "wCountry" : "wCountries") }),
      mbHasNew: unread.length > 0, mbCount: unread.length,
      mbTitle: unread.length ? tx("mbNew") : tx("mbNone"),
      mbSub: unread.length ? tx("mbNewSub", { n: unread.length, lw: tx(unread.length === 1 ? "wLetter" : "wLetters") }) : tx("mbNoneSub"),
      mtSub: cmGroups.length ? tx("mtSub", { c: cmGroups.length, cw: tx(cmGroups.length === 1 ? "wCountry" : "wCountries") }) : tx("mtEmpty"),
      hasPals: pals.length > 0, palAvatars: pals.map((e) => e.photo).filter(Boolean).slice(0, 3),
      palsText: tx("mtPals", { n: pals.length, nw: tx(pals.length === 1 ? "wPal" : "wPals") }), sentCount: sentL.length, recvCount: received.length,
      findPal: () => this.findPal(), palPhase: pal ? pal.phase : null, palCc: pal && pal.phase === "spin" ? pal.cc : pal && pal.phase === "found" ? pal.cc : null,
      palCard: palM ? { ...mini(palM), catName: palM.cat_name || "", key: pal.key } : null,
      palWrite: () => { const m = palM; this.setState({ pal: null }); m && this.letterTo(m); }, palClose: () => { clearInterval(this.palSpin); this.setState({ pal: null }); },
      gmCards: byPopular.slice(0, 8).map(mini), hasGm: byPopular.length > 0, goExplore: () => { this.go("explore", { sheet: null }); this.loadExplore(); },
      goLetters: () => { this.go("mailbox", { sheet: null, mbTab: "received" }); this.refreshMail(); },
      goLetterMap: () => this.go("map", { sheet: null }),
      hmHead: tx("hmHead"), hmSub: tx("hmSub"), hmCta: tx(draftOpen ? "hmCtaDraft" : sentL.length ? "hmCta" : "hmCtaFirst"), hmEnvelope: tx("hmEnvelope"), hmLetterTo: tx("hmLetterTo"), hmLetterLine: tx("hmLetterLine"), startLetter: () => this.openCompose(),
      cmFeedLink: tx("cmFeedLink"), dmTitle: tx("dmTitle"),
      todayMode: !!st.todayMode, skipToday: () => this.go("home", { sheet: null, todayMode: false }),
      exTab: st.exTab, exTabs: [["latest", tx("exLatest")], ["popular", tx("exPopular")]].map(([id, label]) => ({ id, label, on: st.exTab === id, tap: () => this.setState({ exTab: id }) })),
      exCards: (st.exTab === "popular" ? byPopular : (st.mapMoments as MomentCard[])).map(mini),
      exLoading: !st.mapMoments.length && st.feedState === "loading",
    };

    const myLatest = st.mine[0];
    // ---- the letter from Home (see openCompose)
    const c = st.cmp, cCC = c ? c.country : "";
    const cmpVals = !c ? { sCompose: false } : {
      cpT: Object.fromEntries(CP_KEYS.map((k) => [k, tx(k)])),
      sCompose: cur === "compose", cmpStep: c.step, cmpBusy: !!c.busy, cmpErr: c.err || "", cmpWaiting: !!c.waiting,
      cmpText: c.text, cmpPhoto: c.photo, cmpCatName: c.catName, cmpCountry: cCC, cmpTextMax: 500,
      cmpFlag: cCC ? flagOf(cCC) : "🌏", cmpCountryName: cCC ? cName(cCC) : "", cmpPm: cCC ? postmarkOf(cCC) : "", cmpStamp: STAMPS[c.stamp || 0],
      cmpCanNext: c.step === 1 ? !!c.photo && !!c.text.trim() : c.step === 2 ? !!c.catName.trim() && !!cCC : true,
      cmpSign: (c.catName || "").trim() || tx("cpYourCat"),
      cmpFromLine: tx("cpFromLine", { name: (c.catName || "").trim() || tx("cpYourCat"), flag: cCC ? flagOf(cCC) : "", country: cCC ? cName(cCC) : "" }),
      setCmpText: (e) => this.setCmp({ text: e.target.value.slice(0, 500), err: "" }),
      setCmpCat: (e) => this.setCmp({ catName: e.target.value.slice(0, 24), err: "" }),
      setCmpCountry: (e) => this.setCmp({ country: e.target.value, err: "" }),
      cmpPickPhoto: () => this.setState({ sheet: "photo", photoFor: "compose" }),
      // a few ways to begin: tapping one writes just the start of a sentence about your cat (by name once it has one)
      // on the letter, on a new line after what's already there (which stays), for you to finish
      cmpTips: [1, 2, 3, 4].map((n) => {
        const name = (c.catName || "").trim(), start = name ? tx("cpTip" + n + "Pre", { name }) : tx("cpTip" + n + "PreAnon");
        return { label: tx("cpTip" + n), add: () => { const t = this.state.cmp?.text || ""; this.setCmp({ text: ((t.trim() ? t.replace(/\s*$/, "") + "\n" : "") + start).slice(0, 500), err: "" }); } };
      }),
      cmpNext: () => this.cmpNext(), cmpBack: () => this.cmpBack(), cmpClose: () => this.cmpClose(), cmpSend: () => this.cmpSend(),
      cmpEditLetter: () => this.setCmp({ step: 1, err: "" }), cmpEditCat: () => this.setCmp({ step: 2, editCat: true, err: "" }),
    };
    return {
      t, myName,
      sIntro: cur === "intro", sOnboard: cur === "onboard", sFeed: cur === "home", sShare: cur === "share", sCamera: cur === "camera",
      sDeliveryMap: cur === "deliveryMap", sArrived: cur === "arrived", sLetters: cur === "letters", sMailbox: cur === "mailbox", sExplore: cur === "explore", sMap: cur === "map", sPassport: cur === "passport",
      showNav: ["home", "explore", "mailbox", "passport"].includes(cur) || (cur === "catmap" && !st.cmSel), tabs,
      showBack: ["onboard", "letters", "map"].includes(cur) || (cur === "share" && !st.todayMode),
      back: () => { this.stopCam(); this.go(backMap[cur] || "home", { sheet: null }); },
      navItems,
      goHome: () => this.go(me ? "home" : "onboard", { sheet: null }),
      authReady: st.authReady,

      // intro (2 steps)
      introStep: st.introStep,
      introNext: () => { const n = this.state.introStep || 0; if (me) this.go("home", { sheet: null }); else if (n < 2) this.setState({ introStep: n + 1 }); else this.go("onboard", { sheet: null }); },
      introTo: (i) => this.setState({ introStep: i }),
      // onboarding world map: letters from Seoul to cat lovers around the world and back (illustration)
      introMapSrc: "./globe.html?mode=mini&bg=E8EFF3&from=" + globePoint("KR") + "&pals=" + ["GB", "IT", "JP", "TW", "TH", "AU"].map((c) => globePoint(c) + ":b").join(","),

      // onboarding
      onbNick: st.onbNick, setOnbNick: (e) => this.setState({ onbNick: e.target.value.slice(0, 24), onbErr: "" }),
      onbCountry: st.onbCountry, setOnbCountry: (e) => this.setState({ onbCountry: e.target.value, onbErr: "" }),
      onbFlag: st.onbCountry ? flagOf(st.onbCountry) : "🌏", onbPm: st.onbCountry ? postmarkOf(st.onbCountry) : "./assets/pm/seoul.png",
      onbBusy: st.onbBusy, onbErr: st.onbErr, join: () => this.join(), countryOpts: opts,
      onbReady: !!st.onbNick.trim() && !!st.onbCountry && !st.onbBusy,

      // home (cat mail)
      homeFeatured, journey, recentLetters, hasRecent: recentLetters.length > 0,
      ...(() => {
        // home map: CatPals' countries with the direction letters have travelled
        const routes = pals.map((e) => {
          const got = e.threads.some((t) => (byThread[t.id] || []).some((l) => l.sender_id !== me.id));
          return globePoint(e.p.country) && e.p.country !== myCC ? globePoint(e.p.country) + ":" + (e.iWrote && got ? "b" : e.iWrote ? "s" : "r") : "";
        }).filter(Boolean);
        if (!routes.length && featured && globePoint(featured.cc) && featured.cc !== myCC) routes.push(globePoint(featured.cc) + ":r");
        const lastAt = letters.length ? letters[letters.length - 1].created_at : featured ? featured.date : null;
        const rel = (iso) => {
          const d = (new Date(iso).getTime() - Date.now()) / 1000, f = new Intl.RelativeTimeFormat(LOC, { numeric: "auto" });
          const a = Math.abs(d);
          return a < 60 ? f.format(0, "second") : a < 3600 ? f.format(Math.round(d / 60), "minute") : a < 86400 ? f.format(Math.round(d / 3600), "hour") : f.format(Math.round(d / 86400), "day");
        };
        const cmRoutes = routes.map((r) => { const [x, y, d] = r.split(":"); return { lon: +x, lat: +y, dir: d }; });
        return {
          cmRoutes,
          miniMapSrc: "./globe.html?mode=mini&bg=F4F2EE&from=" + globePoint(myCC || "KR") + "&pals=" + routes.join(","),
          mapTitle: tx("hMapTitle"),
          mapSub: pals.length ? tx("hMapPals", { n: pals.length, c: palCountries, nw: tx(pals.length === 1 ? "wPal" : "wPals"), cw: tx(palCountries === 1 ? "wCountry" : "wCountries") })
            : journey ? tx("hJourneyTitle", { from: journey.from, to: journey.to }) + " · " + journey.km : tx("hMapEmpty"),
          mapLast: lastAt ? rel(lastAt) : "", mapLastLabel: tx("hLastLetter"),
          goMap: () => this.go("map", { sheet: null }),
        };
      })(),
      hey: tx("hHey", { name: myName }), heyLine: unread.length ? tx("hHeyNew", { n: unread.length }) : tx("hHeyNone"),
      unreadCount: unread.length,
      fromWho: featured ? tx("hFromWho", { name: featured.who, country: cName(featured.cc) }) : "",
      journeyTitle: journey ? tx("hJourneyTitle", { from: journey.from, to: journey.to }) : "",
      heroPhotos: [...new Set([...st.feed.map((m) => photoOf(m)), ...recentLetters.map((r) => r.photo)].filter((u) => u && u !== (featured && featured.photo)))].slice(0, 2),
      homeLoading: st.feedState === "loading" && !featured,
      homeGlobeSrc: "./globe.html?mode=hero&bg=F7F2EA&from=" + (featured ? globePoint(featured.cc) : "") + "&to=" + globePoint(myCC || "KR") + "&k=" + (featured ? featured.id : "none"),
      openToday: () => this.openToday(), nextToday: () => this.nextToday(), closeOpen: () => this.setState({ openFx: null, viewMoment: null }),
      openCard, ...home2, ...exPage, ...cmpVals,
      sCatMap: cur === "catmap", goCatMap: () => { this.go("catmap", { sheet: null, cmSel: null }); this.loadMap(); },
      // Cat Map tab: moments + public letters by country (moments only until the Explore migration is applied)
      ...(() => {
        const useEx = st.exState === "ready";
        const n = useEx ? exAll.length : st.mapMoments.length, groups = useEx ? Object.values(exG) : cmGroups;
        const sel = st.cmSel;
        const selItems = useEx && sel ? exAll.filter((x) => x.author_country === sel) : [];
        return {
          cmMapGroups: groups,
          // the feed chip's faces: a few of the cats in it, one per cat lover (their latest), and how many more
          ...(() => {
            const byUser = new Map<string, string>();
            for (const [uid, photo] of useEx ? exAll.map((it) => [it.author_id, api.feedPhotoUrl(it)]) : st.mapMoments.map((m) => [m.user_id, photoOf(m)])) if (uid && photo && !byUser.has(uid)) byUser.set(uid, photo);
            const all = [...byUser.values()];
            return { cmFeedFaces: all.slice(0, 3), cmFeedMore: Math.max(0, all.length - 3) };
          })(),
          cmSub2: groups.length ? tx("cmSub", { n, c: groups.length, nw: tx(n === 1 ? "wMoment" : "wMoments"), cw: tx(groups.length === 1 ? "wCountry" : "wCountries") }) : tx("cmEmpty"),
          cmSel2: !sel ? null : useEx ? { cc: sel, flag: flagOf(sel), name: cName(sel), countText: tx("cmCount", { n: selItems.length, nw: tx(selItems.length === 1 ? "wMoment" : "wMoments") }),
            cards: selItems.map((it) => ({ id: it.kind + it.id, photo: api.feedPhotoUrl(it), caption: it.message || "", who: it.author_nickname, whoFlag: flagOf(it.author_country), mine: !!me && it.author_id === me.id,
              likes: it.like_count, liked: it.liked_by_me, like: () => this.toggleFeedLike(it), isLetter: it.kind === "letter", open: it.kind === "moment" ? () => this.openMoment(asMoment(it)) : null })) } : null,
        };
      })(),
      // the latest letter's journey, shown on the globe like the original delivery card
      cmFlight: (() => {
        const l = letters[letters.length - 1], th = l && threadById[l.thread_id];
        if (!me || !th) return null;
        const o = otherOf(th), mine = l.sender_id === me.id, a = mine ? myCC : o.country, b2 = mine ? o.country : myCC;
        if (!COUNTRY_COORDS[a] || !COUNTRY_COORDS[b2]) return null;
        const d = distanceKm(a, b2);
        return { mine, key: l.id, play: !flown().includes(l.id), doneText: tx(mine ? "cmSentDone" : "cmGotDone", { name: o.nickname }),
          label: tx(mine ? "cmLastSent" : "cmLastGot"), fromFlag: flagOf(a), from: cName(a), toFlag: flagOf(b2), to: cName(b2), who: o.nickname,
          km: d == null ? "" : fmt(d) + " km", when: relTime(l.created_at, LOC),
          a: { lon: COUNTRY_COORDS[a][0], lat: COUNTRY_COORDS[a][1] }, b: { lon: COUNTRY_COORDS[b2][0], lat: COUNTRY_COORDS[b2][1] } };
      })(),
      cmGroups, cmHome: COUNTRY_COORDS[myCC] ? { lon: COUNTRY_COORDS[myCC][0], lat: COUNTRY_COORDS[myCC][1] } : null,
      cmSub: cmGroups.length ? tx("cmSub", { n: st.mapMoments.length, c: cmGroups.length, nw: tx(st.mapMoments.length === 1 ? "wMoment" : "wMoments"), cw: tx(cmGroups.length === 1 ? "wCountry" : "wCountries") }) : tx("cmEmpty"),
      cmSel: cmSelGroup && { ...cmSelGroup, cards: cmSelGroup.items.map((m) => ({ id: m.id, photo: photoOf(m), caption: m.caption, who: m.nickname, whoFlag: flagOf(m.author_country), mine: !!me && m.user_id === me.id, open: () => this.openMoment(m) })) },
      // the flight has landed: "Sent" on the card, then on to the Mailbox (the letter's tab); each letter only once
      cmFlightDone: (f) => { if (f.key !== "sample") markFlown(f.key); if (this.state.screen === "catmap") { this.go("mailbox", { sheet: null, mbTab: f.mine ? "sent" : "received" }); this.refreshMail(); } },
      cmSelect: (cc) => this.setState({ cmSel: cc }), cmClose: () => this.setState({ cmSel: null }),
      openFx: st.openFx, goMailbox: () => this.go("mailbox", { sheet: null, mbTab: "received" }),
      myAvatar: photoOf(st.mine[0]), myInitial: (myName || "?").slice(0, 1).toUpperCase(), openProfile: () => this.go("passport", { sheet: null, ppTab: "mine" }),
      // feed
      feedCards: st.feed.map(card), topCards: st.top.map(card), hasTop: st.top.length > 0,
      feedLoading: st.feedState === "loading" && !st.feed.length, feedError: st.feedState === "error" ? st.feedErr : "",
      feedEmpty: st.feedState === "ready" && !st.feed.length, feedEmptyText: st.mine.length ? tx("feedOnlyMine") : tx("noMoments"), moreCats: () => { this.loadFeed(); this.loadTop(); },
      openShare: () => this.openShare(), quickShare: () => this.quickShare(),

      // share
      shareCats: [["my_cat", tx("myCat")], ["met_cat", tx("metCat")]].map(([id, label]) => ({ label, bg: st.shareCat === id ? "#fff" : "transparent", color: st.shareCat === id ? "#22304A" : "#a89f8d", shadow: st.shareCat === id ? "0 1px 3px rgba(0,0,0,.1)" : "none", tap: () => this.setState({ shareCat: id }) })),
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
      sendBg: (st.draft.trim() || st.draftPhoto) && !st.sending ? "#22304A" : "#B9B2A4",
      draftPhoto: st.draftPhoto || "", hasDraftPhoto: !!st.draftPhoto, noDraftPhoto: !st.draftPhoto,
      replyPhotoRef: this.replyPhotoRef || (this.replyPhotoRef = React.createRef()),
      pickReplyPhoto: () => { this.setState({ photoFor: "letter" }); this.replyPhotoRef.current && this.replyPhotoRef.current.click(); },
      onReplyPhoto: (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) { this.setState({ photoFor: "letter" }); this.afterPhoto(f); } },
      clearReplyPhoto: () => { this.draftBlob = null; this.setState({ draftPhoto: null, draftPublic: false }); },
      draftPublic: !!st.draftPublic && !!st.draftPhoto, toggleDraftPublic: () => { if (this.state.draftPhoto) this.setState((p) => ({ draftPublic: !p.draftPublic })); },
      sendLetter: () => this.sendLetter(),
      draftStamp: STAMPS[st.stamp], nextStamp: () => this.setState((p) => ({ stamp: (p.stamp + 1) % STAMPS.length })),

      // mailbox
      mbTabs: [tabDef("received", tx("received"), { badge: unreadThreads > 0, count: unread.length }), tabDef("sent", tx("sent")), tabDef("pals", tx("catpals"))],
      mbShowCards: st.mbTab !== "pals", mbShowPals: st.mbTab === "pals",
      mbCards, palRows,
      mbEmpty: st.mailReady && (st.mbTab === "pals" ? !palRows.length : !mbCards.length),
      mbTab: st.mbTab, mbReady: !me || !!st.mailReady, mbReceived, mbSent, mbPals,
      mbT: Object.fromEntries(["mbEmptyRecvT", "mbEmptyRecvD", "mbEmptySentT", "mbEmptySentD", "mbEmptyPalsT", "mbEmptyPalsD", "mbSendCta", "mbNewTag", "mbSentMark", "mbFromLabel", "mbToLabel", "mbSampleNote", "mbCapRecv", "mbCapSent", "mbCapPals"].map((k) => [k, tx(k)])),

      // delivery + arrived (prototype animations)
      globeDeliverySrc: dest && me ? "./globe.html?mode=delivery&from=" + globePoint(myCC) + "&to=" + globePoint(dest.cc) + "&k=" + st.sendCount : "",
      // the letter's flight on the dotted globe (DeliveryMapScreen → LetterFlight): your country → theirs
      ...(() => {
        const fromCC = myCC || st.cmp?.country || "";   // before the first letter's profile exists: the country picked on the letter
        return {
          flightFrom: fromCC ? COUNTRY_COORDS[fromCC] || null : null, flightTo: dest ? COUNTRY_COORDS[dest.cc] || null : null, flightKey: st.sendCount,
          flightFromLabel: fromCC ? flagOf(fromCC) + " " + (st.cmp?.catName || myName) : "", flightToLabel: dest ? flagOf(dest.cc) + " " + dest.name : "",
          dRouteFrom: fromCC ? flagOf(fromCC) + " " + cName(fromCC) : "", dmFinding: tx("cpSending"), dmWaiting: !dest,
          // the countries the "To" spins through while a cat pal is found (the card shuffles them)
          dmSpinPool: SPIN_CC.filter((cc) => cc !== fromCC && COUNTRY_COORDS[cc]).map((cc) => flagOf(cc) + " " + cName(cc)),
        };
      })(), dRouteTo: dest ? flagOf(dest.cc) + " " + cName(dest.cc) : "", dmFrom: tx("dmFrom"), dmTo: tx("dmTo"),
      mapDone: st.mapDone, destKm: destKm == null ? "" : fmt(destKm), destCity: dest ? cName(dest.cc) : "", arrFrom: cName(myCC),
      tapDeliveryCard: () => { if (this.state.mapDone) this.go("arrived"); },
      todayDate: ymd(new Date().toISOString()),
      isNewPal: st.isNewPal, destSlot: dest ? "pal-" + dest.uid : "", destImg: dest ? dest.photo : "", destStamp: STAMPS[st.stamp],
      openDestProfile: () => this.go("letters"),
      // the Arrived page: the letter just sent (your latest), where it went, and on to the Mailbox or home
      ...(() => {
        const l = me ? [...st.letters].reverse().find((x) => x.sender_id === me.id) : null;
        return {
          arrLetter: l ? { text: l.body || "", photo: l.photo_path ? st.urls[l.photo_path] || "" : "", sign: myName, flag: flagOf(myCC), country: cName(myCC) } : null,
          arrT: Object.fromEntries(["cpDear", "cpPhotoSlot", "cpChangePhoto", "cpAddPhoto", "arrTitle", "arrCta", "arrHome", "dmFrom", "dmTo"].map((k) => [k, tx(k)])),
          arrSub: dest ? tx("arrSub", { name: dest.name, country: cName(dest.cc) }) : "",
          arrFromFlag: flagOf(myCC), arrToFlag: dest ? flagOf(dest.cc) : "", arrToName: dest ? dest.name : "", arrFromName: myName,
          // the two cats: yours (the photo on this letter, else your latest moment) and theirs (their moment's photo)
          arrFromPhoto: (l && l.photo_path && st.urls[l.photo_path]) || photoOf(st.mine[0]) || "", arrToPhoto: dest ? dest.photo || "" : "",
          arrDate: new Date().toLocaleDateString(LOC, { year: "numeric", month: "short", day: "numeric" }),
          arrToMailbox: () => { this.go("mailbox", { sheet: null, mbTab: "sent" }); this.refreshMail(); },
          arrToHome: () => this.go("home", { sheet: null }),
        };
      })(),
      myPm: postmarkOf(myCC), stampMotif: STAMPS[st.stamp],

      // map
      globeMapSrc: "./globe.html?mode=map&from=" + globePoint(myCC || "KR")
        + "&sent=" + encodeURIComponent([...new Set(pals.filter((e) => e.iWrote).map((e) => globePoint(e.p.country)).filter(Boolean))].join(","))
        + "&recv=" + encodeURIComponent([...new Set(stampPals.map((e) => globePoint(e.p.country)).filter(Boolean))].join(",")),

      // passport
      openMe: () => this.go("passport", { ppTab: "mine" }),
      hasPhoto: !!myLatest, noPhoto: !myLatest, myPhoto: photoOf(myLatest),
      ...ppBook,
      ppT: Object.fromEntries(["ppTitle", "ppSub", "ppName", "ppIssued", "ppBook", "ppNotYet", "ppSampleNote", "cpYourCat", "ppEmblem", "ppTagline", "ppNoLabel", "ppFile", "ppStampsHead", "ppAsia", "ppEurope", "ppAmericas", "ppAfrica", "ppOceania", "ppEmptyPage"].map((k) => [k, tx(k)])),
      // the passport number: only a real one (the profile's, once issued); none is made up here. The sample shows one, marked as such.
      ppNo: ppBook.ppSample ? "CP—0001" : me && me.passport_no ? String(me.passport_no) : "",
      ppCat: (() => {
        const cc = myCC || (ppBook.ppSample ? "KR" : "");   // the sample: an illustrative cat, from Korea
        return { name: myName || (ppBook.ppSample ? "Mochi" : tx("cpYourCat").replace(/^./, (x) => x.toUpperCase())), photo: photoOf(myLatest) || (mbSent[0] && mbSent[0].photo) || (ppBook.ppSample ? "./assets/cats/cat-4.jpg" : ""), cc, flag: cc ? flagOf(cc) : "", country: cc ? cName(cc) : "" };
      })(),
      ppStats: [{ n: palCountries, l: tx("countries") }, { n: pals.length, l: tx("cCatsMet") }, { n: stampPals.length + 1, l: tx("stamps") }],
      ppTabs: [["stamps", tx("stampBook")], ["public", tx("pPublic")], ["mine", tx("myMoments")], ["journal", tx("journal")]].map(([id, label]) => ({ label, bg: st.ppTab === id ? "#fff" : "transparent", color: st.ppTab === id ? "#22304A" : "#a89f8d", shadow: st.ppTab === id ? "0 1px 3px rgba(0,0,0,.1)" : "none", tap: () => this.setState({ ppTab: id }) })),
      ppShowStamps: st.ppTab === "stamps", ppShowJournal: st.ppTab === "journal", ppShowMine: st.ppTab === "mine", ppShowPublic: st.ppTab === "public",
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
      // ?mapSample=1 only: sample pals and letters on the Map (nothing real; the subtitle says it's a sample)
      ...(MAP_SAMPLE ? (() => {
        const hc = COUNTRY_COORDS[myCC] ? myCC : "KR", h = COUNTRY_COORDS[hc], pals = SAMPLE_PALS.filter((p) => p[0] !== hc && COUNTRY_COORDS[p[0]]);
        const at = (cc) => ({ lon: COUNTRY_COORDS[cc][0], lat: COUNTRY_COORDS[cc][1] });
        const sel = pals.find((p) => p[0] === st.cmSel), last = pals[0], d = distanceKm(hc, last[0]);
        return {
          cmMapGroups: pals.map(([cc, , , n, s2, r2]) => ({ cc, ...at(cc), count: s2 + r2, photo: "./assets/cats/cat-" + n + ".jpg", id: "sample-" + cc, kind: "pal" })),
          cmFeedFaces: pals.slice(0, 3).map((p) => "./assets/cats/cat-" + p[3] + ".jpg"), cmFeedMore: Math.max(0, pals.length - 3),
          cmRoutes: pals.map(([cc, , , , s2, r2]) => ({ ...at(cc), dir: s2 && r2 ? "b" : s2 ? "s" : "r" })),
          cmHome: { lon: h[0], lat: h[1] }, cmSub2: tx("cmSampleNote"), cmIsSample: true,
          sentCount: pals.reduce((a, p) => a + p[4], 0), recvCount: pals.reduce((a, p) => a + p[5], 0),
          cmFlight: { mine: true, key: "sample", play: true, doneText: tx("cmSentDone", { name: last[1] }), label: tx("cmLastSent"), fromFlag: flagOf(hc), from: cName(hc), toFlag: flagOf(last[0]), to: cName(last[0]), who: last[1],
            km: d == null ? "" : fmt(d) + " km", when: relTime(new Date(Date.now() - 2 * 86400000).toISOString(), LOC), a: at(hc), b: at(last[0]) },
          cmSel2: sel ? { cc: sel[0], flag: flagOf(sel[0]), name: cName(sel[0]), countText: tx("cmCount", { n: 1, nw: tx("wMoment") }),
            cards: [{ id: "sample-" + sel[0], photo: "./assets/cats/cat-" + sel[3] + ".jpg", caption: sel[2], who: sel[1], whoFlag: flagOf(sel[0]), mine: false }] } : null,
        };
      })() : {}),
    };
  }
}

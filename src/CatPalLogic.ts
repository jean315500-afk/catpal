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
import { COUNTRY_COORDS, countryName, countryOptions, distanceKm, flagOf, globePoint, guessCountry, POSTMARK_COUNTRIES, POSTMARK_FILES, postmarkOf, stampOf } from './community/countries';
import { dataUrlToBlob, toUploadJpeg } from './community/image';
import { enableReplyNotifications, REPLY_NOTIFY_OFFERED, replyNotifyState } from './community/notify';
import { fmtDate, fmtListTime } from './community/dates';
import { initialLang, saveLang } from './community/lang';
import { kakaoConfigured, loadKakao, shareKakao } from './community/kakao';
import type { CatStampInput } from './solana/catStamp';

for (const l in COMMUNITY_STRINGS) I18N[l] = { ...(I18N[l] || {}), ...COMMUNITY_STRINGS[l] };

const STAMPS = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => "./assets/stamp-" + i + ".png");
const pad = (n) => String(n).padStart(2, "0");
/** the app's languages (id, name, locale) */
const LANG_LIST = [["en", "English", "en-US"], ["ko", "한국어", "ko-KR"], ["ja", "日本語", "ja-JP"], ["zh", "中文", "zh-CN"], ["es", "Español", "es-ES"], ["fr", "Français", "fr-FR"], ["de", "Deutsch", "de-DE"], ["pt", "Português", "pt-BR"], ["th", "ไทย", "th-TH"], ["id", "Bahasa Indonesia", "id-ID"]];
/** where it opens: the language picked before (on the landing page or here), else the browser's (Korean or English) */
const APP_LANG = initialLang(LANG_LIST.map((x) => x[0]));
try { document.documentElement.lang = APP_LANG; } catch { /* no document */ }
/** a Korean particle after a name: the first form after a final consonant ("구름이"), the second after a vowel ("보리가");
 *  으로/로 takes 로 after ㄹ too. A name not in Hangul (Léa, Tom) goes by its last letter: a vowel or not. */
const josa = (w: string, a: string, b: string) => {
  const c = w.trim().slice(-1), code = c.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) { const f = (code - 0xac00) % 28; return f === 0 || (a === "으로" && f === 8) ? b : a; }
  return /[aeiouy]$/i.test(c) ? b : a;
};
const optCache: Record<string, { cc: string; label: string }[]> = {};

// ---- the letter from Home: its draft (kept across reloads), the cat's name
const CP_KEYS = ["cpSealing", "cpS1Title", "cpS1Sub", "cpAddPhoto", "cpPhotoSlot", "cpChangePhoto", "cpMsgPh", "cpContinue", "cpS2Title", "cpS2Sub", "cpCatName", "cpCatNamePh", "cpFrom", "cpPickCountry",
  "cpS3Title", "cpS3Sub", "cpEditLetter", "cpEditCat", "cpSend", "cpSending", "cpDear", "cpWaitTitle", "cpWaitSub", "cpTryAgain", "cpBackHome", "cpBack",
  "cpKindAsk", "cpIdeas", "cpS2MetTitle", "cpS2MetSub", "cpPenName", "cpPenNamePh", "cpEditMet", "cpInviting",
  "ivReadyTitle", "ivReadySub", "ivShare", "ivCopy", "ivCopied", "ivDone", "ivCancel", "ivNotYet", "ivOpened", "ivPublicNote"];
const DRAFT = "cp-letter-draft", CAT_NAME = "cp-cat-name", NICK_IS_CAT = "cp-nick-is-cat";
/** a reply being written to a letter that came by a link (kept, with the link's token, until it's sent) */
const INV_DRAFT = "cp-invite-reply";
/** "?letter=<token>": a letter sent to you by link (read it without signing in; writing back signs you in) */
const INVITE_TOKEN = (() => { try { const t = new URLSearchParams(location.search).get("letter"); return t && /^[0-9a-f]{64}$/.test(t) ? t : null; } catch { return null; } })();
const dropInviteParam = () => { try { const u = new URL(location.href); if (u.searchParams.has("letter")) { u.searchParams.delete("letter"); history.replaceState(history.state, "", u.pathname + u.search + u.hash); } } catch { /* leave the address */ } };
/** a friend's "be my cat pal" link (?pal=…, kept by main.tsx through a first visit's story), and the way in from the
 *  landing story's Start (?start=home) — where the "start with a friend?" step comes first */
const PAL_KEY = "cp-pal-token";
const palToken = () => { try { return localStorage.getItem(PAL_KEY); } catch { return null; } };
const dropPal = () => { try { localStorage.removeItem(PAL_KEY); const u = new URL(location.href); if (u.searchParams.has("pal")) { u.searchParams.delete("pal"); history.replaceState(history.state, "", u.pathname + u.search + u.hash); } } catch { /* fine */ } };
const FROM_STORY = (() => { try { return new URLSearchParams(location.search).get("start") === "home"; } catch { return false; } })();
const palUrl = (token: string) => { try { return location.origin + "/?pal=" + token; } catch { return "/?pal=" + token; } };
const inviteUrl = (token: string) => { try { return location.origin + "/?letter=" + token; } catch { return "/?letter=" + token; } };
const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) => (c ^ (Math.random() * 16) >> (c / 4)).toString(16)));
/** whether a letter is in progress (something on it), known without re-reading the stored photo on every render */
let draftStarted: boolean | null = null;
/** the delivery card's "To" spins through these while a cat pal is being found (then stops on theirs) */
const SPIN_CC = ["JP", "FR", "US", "GB", "IT", "AU", "CA", "TW", "TH", "SG", "ID", "BR", "DE", "ES", "MX", "IN", "NZ", "NL", "SE", "PH", "VN", "KR", "TR", "AR"];
/** "?mapSample=1": the Map as it looks once letters go back and forth — sample pals, labelled as a sample */
/** the letters whose flight the Map has already played (each plays once, then rests where it landed) */
const FLOWN = "cp-map-flown";
const flown = (): string[] => { try { return JSON.parse(localStorage.getItem(FLOWN) || "[]"); } catch { return []; } };
const markFlown = (id: string) => { try { localStorage.setItem(FLOWN, JSON.stringify([...flown().filter((x) => x !== id), id].slice(-20))); } catch { /* private mode */ } };
const MB_SAMPLE = typeof location !== "undefined" && new URLSearchParams(location.search).has("mbSample");
const MAP_SAMPLE = typeof location !== "undefined" && new URLSearchParams(location.search).has("mapSample");
/** "?arrSample=1": the Arrived page after a first reply to France (stamp, postcard to share) — a sample, labelled as such */
const ARR_SAMPLE = typeof location !== "undefined" && new URLSearchParams(location.search).has("arrSample");
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
  if (c && c.reply && c.reply.invite) { saveJSON(INV_DRAFT, c); return; }   // a reply to a letter by link: kept on its own
  if (c && (c.reply || c.invite)) return;   // a reply is written there and then; a letter gone as a link is no longer a draft
  const { busy, err, ...keep } = c || {};
  draftStarted = started(keep);
  try { localStorage.setItem(DRAFT, JSON.stringify(keep)); }
  catch (_) { try { localStorage.setItem(DRAFT, JSON.stringify({ ...keep, photo: "" })); } catch (__) { /* storage off: it lives only in memory */ } }
}
function clearDraft() { draftStarted = false; try { localStorage.removeItem(DRAFT); } catch (_) {} }
/** kept as JSON (without the busy / error bits), the photo dropped if it doesn't fit */
function saveJSON(key: string, c: any) {
  const { busy, err, ...keep } = c || {};
  try { localStorage.setItem(key, JSON.stringify(keep)); } catch (_) { try { localStorage.setItem(key, JSON.stringify({ ...keep, photo: "" })); } catch (__) { /* storage off */ } }
}
const readJSON = (key: string) => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (_) { return null; } };
/** what we know of your cat: its name as last used, else the name on your latest moment, else your profile's name */
function catInfo(me: Profile | null, mine: MomentCard[]) {
  let saved = ""; try { saved = localStorage.getItem(CAT_NAME) || ""; } catch (_) {}
  return { name: saved || (mine.find((m) => m.cat_name)?.cat_name ?? "") || (me ? me.nickname : "") };
}

export default class CatPalLogic extends DCLogic {
  state: Record<string, any> = {
    // the app opens on Home (the red envelope) — with or without "?start=home" from the landing page's Start button;
    // a first letter makes the profile as it's sent, so the old intro (nickname + country first) isn't needed up front
    screen: "home", prev: "home", lang: APP_LANG, langOpen: false, sheet: null, camErr: false, introStep: 0,
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
    dest: null, mapDone: false, sendCount: 0, isNewPal: false, reading: null, replyReward: null, ppCountry: null,
    // passport
    ppTab: "stamps", mine: [],
    // the letter being written from Home (photo + hello → your cat → preview → off it goes); see openCompose
    cmp: null,
    // no one to send to yet (the Map's globe waits with "Invite a friend" / "Save for later")
    noPal: false,
    // my letters sent as links (Sent: "link shared" / "opened" until a friend writes back), and a letter sent to me by link
    invites: [], inv: INVITE_TOKEN ? { token: INVITE_TOKEN, phase: "loading", d: null } : null,
    // cat pal links: the step after the story ("start with a friend?"), a friend's link to accept, and my links' threads
    palShare: null, palInv: null, palThreads: [],
    // reply notifications (Arrived): on only once really registered on this device
    notify: replyNotifyState(),
  };
  timers = [];
  I18N = I18N;

  componentDidMount() {
    // a letter was being written when the page was left: back to it, as it was
    const draft = readDraft();
    if (INVITE_TOKEN) this.setState({ screen: "invite" });
    else if (ARR_SAMPLE) this.setState({ screen: "arrived" });
    // a friend's link (once the story, if any, is done): who invited you, and "Accept"
    else if (palToken()) this.setState({ screen: "palAccept", palInv: { token: palToken(), phase: "loading", d: null } });
    // just in from the story's Start: "start with a friend?" first (once there), then Home as before
    else if (FROM_STORY && !(draft && draft.open)) { this.setState({ screen: "palStart", palShare: { phase: "idle" } }); loadKakao(); }
    else if (draft && draft.open && (!this.state.screen || this.state.screen === "home")) { this.setState({ screen: "compose", cmp: { ...draft, busy: false, err: "" } }); this.pushLetterStep(); }
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
    if (this.state.inv) this.loadInvite();
    if (this.state.palInv) this.loadPalInvite();
    if (this.state.me) api.linkMyPals().then((n) => { if (n) this.refreshMail(); }).catch(() => { /* not set up yet */ });
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
  refreshMail(): Promise<void> {
    if (!this.state.me) return Promise.resolve();
    // one at a time; asking again while one runs waits for it and then looks again (so what was just made is there)
    if (this.mailP) return (this.mailAgain ||= this.mailP.then(() => { this.mailAgain = null; return this.refreshMail(); }));
    this.mailP = this.refreshMailNow().finally(() => { this.mailP = null; });
    return this.mailP;
  }
  async refreshMailNow() {
    this.mailBusy = true; this.lastMail = Date.now();
    this.loadInvites();
    api.myPalThreads().then((palThreads) => this.setState({ palThreads })).catch(() => { /* not set up yet */ });
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
  /** my letters sent as links (Sent) — quietly nothing before the invites update is in the database */
  async loadInvites() { const me = this.state.me; if (!me) return; try { this.setState({ invites: await api.myInvites(me.id) }); } catch (_) { /* not set up yet */ } }
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
  /** the country a thread's other cat lover writes from */
  countryOf(threadId: string) { const th = this.state.threads.find((t) => t.id === threadId); return th ? this.otherOf(th).country : ""; }
  /** have I written back to anyone in this country (a letter of mine after one of theirs, in the same thread)? */
  wroteBackTo(cc: string) {
    const me = this.state.me, L = this.state.letters as Letter[]; if (!me) return false;
    return L.some((l) => l.sender_id === me.id && this.countryOf(l.thread_id) === cc && L.some((x) => x.thread_id === l.thread_id && x.sender_id !== me.id && x.created_at < l.created_at));
  }
  /** The Mailbox: open a letter (the envelope opens, then the letter to read). Opening it marks it read — and the first
   *  letter ever opened from a country brings that country's stamp (remembered here, to say so while reading). */
  openLetter(l: Letter) {
    const me = this.state.me; if (!me) return;
    const cc = this.countryOf(l.thread_id);
    const firstStamp = !l.read_at && !(this.state.letters as Letter[]).some((x) => x.id !== l.id && x.sender_id !== me.id && x.read_at && this.countryOf(x.thread_id) === cc);
    this.setState({ reading: { id: l.id, firstStamp } });
    if (!l.read_at) {
      const now = new Date().toISOString();
      this.setState((p) => ({ letters: p.letters.map((x) => (x.thread_id === l.thread_id && x.sender_id !== me.id && !x.read_at ? { ...x, read_at: now } : x)) }));
      api.markThreadRead(l.thread_id).catch(() => {});
    }
  }
  /** "Write back to …": a letter in reply, on the same paper as the first — their cat and their letter kept with it.
   *  `mode`: "reply" from their letter (답장 쓰기), "write" from your page with them (편지 쓰기) — the same thread either way. */
  writeBack(l: Letter, mode: "reply" | "write" = "reply") {
    const me = this.state.me, th = this.state.threads.find((t) => t.id === l.thread_id); if (!me || !th) return;
    const o = this.otherOf(th), cat = catInfo(me, this.state.mine);
    const photo = (l.photo_path && this.state.urls[l.photo_path]) || (th.moment && th.owner_id === o.id ? api.momentPhotoUrl(th.moment.photo_path) : "");
    const cmp = { step: 1, text: "", photo: "", catName: cat.name || me.nickname, country: me.country, stamp: Math.floor(Math.random() * STAMPS.length), waiting: false, open: true, busy: false, err: "",
      reply: { threadId: th.id, letterId: l.id, name: o.nickname, cc: o.country, photo, said: (l.body || "").trim(), at: l.created_at, mode } };
    this.setState({ reading: null, replyReward: null });
    this.go("compose", { sheet: null, cmp });
    this.pushLetterStep();
  }
  /** the Mailbox's sample letters (?mbSample=1): the reply paper, to try — sending it only says it's a sample */
  sampleWriteBack(c) {
    const me = this.state.me, cat = catInfo(me, this.state.mine);
    const cmp = { step: 1, text: "", photo: "", catName: cat.name || me?.nickname || "", country: me?.country || guessCountry() || "", stamp: Math.floor(Math.random() * STAMPS.length), waiting: false, open: true, busy: false, err: "",
      reply: { sample: true, threadId: null, name: c.name, cc: c.cc, photo: c.photo, said: (c.body || "").trim(), at: null, dateText: c.dateLong || "" } };
    this.go("compose", { sheet: null, cmp });
    this.pushLetterStep();
  }
  /** "Write to …" in a thread (or about a moment, before there's a thread): the usual letter paper, in reply — to their
   *  latest letter if there is one, else to them */
  writeIn() {
    const s = this.state, me = s.me; if (!me) return;
    const th: Thread | undefined = s.threadId ? s.threads.find((t) => t.id === s.threadId) : undefined;
    if (th) {
      const theirs = [...(s.letters as Letter[])].reverse().find((l) => l.thread_id === th.id && l.sender_id !== me.id);
      if (theirs) { this.writeBack(theirs, "write"); return; }
    }
    const m: MomentCard | null = th ? null : s.pendingMoment;
    const o = th ? this.otherOf(th) : m ? { id: m.user_id, nickname: m.nickname, country: m.author_country } : null;
    if (!o) return;
    const theirMoment = m || (s.mapMoments as MomentCard[]).find((x) => x.user_id === o.id);
    const cat = catInfo(me, s.mine);
    const cmp = { step: 1, text: "", photo: "", catName: cat.name || me.nickname, country: me.country, stamp: Math.floor(Math.random() * STAMPS.length), waiting: false, open: true, busy: false, err: "",
      reply: { threadId: th ? th.id : null, moment: m ? { id: m.id, user_id: m.user_id } : null, name: o.nickname, cc: o.country, photo: theirMoment ? api.momentPhotoUrl(theirMoment.photo_path) : "", said: m ? (m.caption || "").trim() : "", mode: "write" } };
    this.setState({ reading: null, replyReward: null });
    this.go("compose", { sheet: null, cmp });
    this.pushLetterStep();
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
      markFlown(letter.id);   // its flight plays now, on the delivery globe — the Map doesn't show it again
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
    const cmp = saved && !saved.sent ? { kind: "my_cat", penName: "", ...saved, route: undefined, inviting: false, ...(saved.step === 4 ? { step: 3 } : {}), clientId: saved.clientId || newId(), waiting: false, open: true, busy: false, err: "" }
      : { step: 1, text: "", photo: "", catName: cat.name, penName: "", kind: "my_cat", clientId: newId(), country: me?.country || guessCountry() || "", stamp: Math.floor(Math.random() * STAMPS.length), waiting: false, open: true, busy: false, err: "" };
    writeDraft(cmp);
    this.setState({ replyReward: null, noPal: false });
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
  /** a first letter asks for the cat's name (or, for a cat you met, yours) and the country; after that they're known
   *  (and can still be edited) */
  cmpKnowsCat() { const c = this.state.cmp; return !!this.state.me && (c?.kind === "met_cat" || !!(c?.catName || "").trim()); }
  /** who signs the letter: your cat, or — a cat you met — you */
  cmpSignName(c) { return c.kind === "met_cat" ? (c.penName || "").trim() || this.state.me?.nickname || "" : (c.catName || "").trim(); }
  cmpNext() {
    const c = this.state.cmp; if (!c) return;
    if (c.step === 1) {
      if (!c.photo) { this.setCmp({ err: this.tx("cpNeedPhoto") }); return; }
      if (!c.text.trim()) { this.setCmp({ err: this.tx("cpNeedMsg") }); return; }
      this.setCmp({ step: this.cmpKnowsCat() && !c.editCat ? 3 : 2, err: "" });
    } else if (c.step === 2) {
      if (!this.cmpSignName(c)) { this.setCmp({ err: this.tx(c.kind === "met_cat" ? "cpNeedPen" : "cpNeedName") }); return; }
      if (!c.country) { this.setCmp({ err: this.tx("cpNeedCountry") }); return; }
      this.setCmp({ step: 3, err: "", editCat: false });
    }
  }
  cmpBack() {
    const c = this.state.cmp; if (!c || c.busy) return;
    if (c.step === 1) { this.cmpClose(); return; }
    if (c.step === 4) { this.cmpClose(); return; }   // the link is made: back is out (to Sent, where it's kept)
    this.setCmp({ step: c.step === 3 && (this.cmpKnowsCat() && !c.editCat) ? 1 : c.step - 1, err: "" });
  }
  /** back to Home; the draft stays for next time */
  cmpClose() {
    const c = this.state.cmp; if (c) writeDraft({ ...c, open: false });
    if (c && c.reply && c.reply.invite) { this.go("invite", { sheet: null }); return; }   // back to the letter that came by link
    if (c && c.invite) { this.go("mailbox", { sheet: null, mbTab: "sent", cmp: null }); return; }
    this.go(c && c.reply ? "mailbox" : "home", { sheet: null, ...(c && c.reply ? { mbTab: "received", cmp: null } : {}) });
  }
  /** your session and profile, made (or brought up to date) as a letter goes: the profile's name is your cat's — or,
   *  for a cat you met, yours (that cat isn't kept as your cat) */
  async ensureMe(c) {
    const met = c.kind === "met_cat", name = (met ? (c.penName || "").trim() : (c.catName || "").trim()).slice(0, 24), cc = c.country;
    let me = this.state.me;
    const uid = me?.id || (await api.currentUserId()) || (await api.signInAnonymously());
    const nameIsCat = !me || localStorage.getItem(NICK_IS_CAT) === uid;
    const nick = met ? name || me?.nickname || "" : nameIsCat ? name : me.nickname;
    if (!me || me.country !== cc || me.nickname !== nick) {
      me = await api.saveProfile(uid, nick, cc);
      try { if (met && name) localStorage.removeItem(NICK_IS_CAT); else if (!met && nameIsCat) localStorage.setItem(NICK_IS_CAT, uid); } catch (_) {}
      const first = !this.state.me;
      this.setState({ me: { ...(this.state.me || {}), ...me } });
      if (first) this.loadAll();
      // a friend's link accepted before (or mine, accepted): with this profile their thread can be made now
      try { if (await api.linkMyPals()) await this.refreshMail(); } catch (_) { /* not set up yet */ }
    }
    if (!met) try { localStorage.setItem(CAT_NAME, name); } catch (_) {}
    return this.state.me as Profile;
  }
  async cmpSend() {
    const c = this.state.cmp;
    if (!c || c.busy || this.cmpSending) return;          // one letter, however many taps
    if (c.reply && c.reply.sample) { this.setCmp({ err: this.tx("mbSampleReply") }); return; }   // a sample's reply: not sent
    this.cmpSending = true;
    // the letter is already sealed in its envelope: off to the map at once, which waits over your country (the cat
    // running) while a cat pal is found and the letter goes out; then it flies (playDelivery)
    // who it's going to, when that's already known (a reply, or a cat pal picked): shown on the map at once, by name
    const known = c.reply ? { name: c.reply.name, cc: c.reply.cc } : c.to ? (() => { const t = (this.state.threads as Thread[]).find((x) => this.otherOf(x).id === c.to); return t ? { name: this.otherOf(t).nickname, cc: this.otherOf(t).country } : null; })() : null;
    this.setState((p) => ({ cmp: p.cmp && { ...p.cmp, busy: true, err: "" }, dest: null, mapDone: false, noPal: false, dmKnown: known && known.name && known.cc ? known : null, sendCount: p.sendCount + 1, screen: "deliveryMap", prev: "compose", langOpen: false }));
    const back = (patch) => { this.setState((p) => ({ screen: "compose", cmp: p.cmp && { ...p.cmp, busy: false, ...patch } })); };
    try {
      // a reply: to the cat lover who wrote, in their thread — no one to find. Its reward (the country's postmark in the
      // passport) only once it has really gone, and only the first time you write back to that country.
      if (c.reply) {
        const r = c.reply;
        let threadId = r.threadId;
        // to someone whose moment you're writing about (no letters yet): the thread on it, made now
        if (r.moment) threadId = await api.openThread(this.state.me.id, r.moment);
        // to the friend whose link you accepted: your profile (made now, if this is your first letter), then your thread
        if (r.pal) {
          await this.ensureMe(c);
          try { await api.linkMyPals(); } catch (_) { /* below says it */ }
          await this.refreshMail();
          const th = (this.state.threads as Thread[]).find((t) => !t.moment_id && this.otherOf(t).id === r.pal);
          if (!th) { back({ err: this.tx("palNotReady", { name: r.name || this.tx("palAFriend") }) }); return; }
          threadId = th.id;
        }
        // a letter that came by link: writing back signs you in (made now) and takes the link — once; that makes the
        // real thread, with their letter in it, which this reply then joins. Until now nothing was delivered.
        if (r.invite) {
          await this.ensureMe(c);
          threadId = await api.claimInvite(r.invite);
          await this.refreshMail();
        }
        const firstMark = !this.wroteBackTo(r.cc);
        this.draftBlob = c.photo ? dataUrlToBlob(c.photo) : null;
        this.setState({ pendingMoment: null, threadId, draft: c.text.trim().slice(0, 500), draftPhoto: c.photo || null, stamp: c.stamp || 0, draftPublic: false, sendErr: "" });
        await this.sendLetter();
        if (this.state.sendErr) { back({ err: this.state.sendErr }); return; }
        if (r.invite) { try { localStorage.removeItem(INV_DRAFT); } catch (_) {} dropInviteParam(); this.setState({ inv: null }); }
        this.setState({ cmp: null, replyReward: { cc: r.cc, name: r.name, first: firstMark } });
        if (this.state.screen === "deliveryMap" && !this.state.dest) { this.go("mailbox", { sheet: null, mbTab: "sent" }); this.refreshMail(); }
        return;
      }
      const cc = c.country;
      // the session and the profile, made now if this is the first letter
      const me = await this.ensureMe(c);
      // to a cat pal you already have (picked on the preview): in your latest thread with them — no one to find
      if (c.to) {
        const ths = (this.state.threads as Thread[]).filter((t) => this.otherOf(t).id === c.to);
        const lastOf = (t: Thread) => (this.state.letters as Letter[]).filter((l) => l.thread_id === t.id).slice(-1)[0]?.created_at || t.created_at;
        const th = ths.sort((a, b) => (lastOf(a) < lastOf(b) ? 1 : -1))[0];
        if (!th) { back({ step: 3, err: this.tx("cpToGone") }); return; }
        const o = this.otherOf(th), firstMark = !this.wroteBackTo(o.country);
        this.draftBlob = dataUrlToBlob(c.photo);
        this.setState({ pendingMoment: null, threadId: th.id, draft: c.text.trim().slice(0, 500), draftPhoto: c.photo, stamp: c.stamp || 0, draftPublic: false, sendErr: "" });
        await this.sendLetter();
        if (this.state.sendErr) { back({ err: this.state.sendErr }); return; }
        clearDraft();
        this.setState({ cmp: null, replyReward: { cc: o.country, name: o.nickname, first: firstMark } });
        if (this.state.screen === "deliveryMap" && !this.state.dest) { this.go("mailbox", { sheet: null, mbTab: "sent" }); this.refreshMail(); }
        return;
      }
      // a random real cat lover: anyone who writes (everyone with a profile), not only those who shared a moment — so
      // the first few people can find each other. Someone new to you first, abroad when there is anyone abroad; their
      // latest moment, if they have one, is what the letter is about (and their cat's photo on the way)
      const [, , people] = await Promise.all([this.loadFeed(), this.loadMap(), api.listPeople().catch(() => [] as Profile[])]);
      const moments = [...this.state.feed, ...this.state.mapMoments].filter((m, i, a) => m.user_id !== me.id && a.findIndex((x) => x.id === m.id) === i);
      const known = new Set((this.state.threads as Thread[]).map((t) => this.otherOf(t).id));
      const byId = new Map<string, { id: string; cc: string; m: MomentCard | null }>();
      for (const p of people) if (p.id !== me.id) byId.set(p.id, { id: p.id, cc: p.country, m: null });
      for (const m of moments) if (!byId.get(m.user_id)?.m) byId.set(m.user_id, { id: m.user_id, cc: m.author_country, m });
      const all = [...byId.values()], fresh = all.filter((x) => !known.has(x.id));
      const pick = (l: typeof all) => l[Math.floor(Math.random() * l.length)];
      const tiers = [fresh.filter((x) => x.cc !== cc), fresh, all.filter((x) => x.m && x.cc !== cc), all.filter((x) => x.m)];
      const to = pick(tiers.find((l) => l.length) || []);
      // nobody yet: nothing is sent. The Map's globe waits over your country and offers to send it to a friend by
      // link, or to keep it (the draft, as it was) for later
      if (!to) { this.setState((p) => ({ noPal: true, cmp: p.cmp && { ...p.cmp, busy: false, step: 3 } })); return; }
      // the letter itself goes through the usual letter sending (a thread — on their moment, or just between you —, the
      // photo upload, the delivery)
      // (a thread with them left empty by a letter that didn't go is used again)
      const empty = (this.state.threads as Thread[]).find((t) => !t.moment_id && this.otherOf(t).id === to.id && !(this.state.letters as Letter[]).some((l) => l.thread_id === t.id));
      const threadId = to.m ? null : empty ? empty.id : await api.openDirectThread(me.id, to.id);
      if (threadId) await this.refreshMail();
      this.draftBlob = dataUrlToBlob(c.photo);
      this.setState({ pendingMoment: to.m, threadId, draft: c.text.trim().slice(0, 500), draftPhoto: c.photo, stamp: c.stamp || 0, draftPublic: false, sendErr: "" });
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
  // ---------------------------------------------------------------- a letter to a friend, by link
  // "Invite a friend" (the Map's, when there's no one to match yet): the sealed
  // letter is kept as an invite with a link to share. It is not delivered — no thread, no letter, no stamp or postmark
  // — until the friend opens it and writes back (claim_invite). One link per letter (its clientId), however many taps.
  async cmpInvite() {
    const c = this.state.cmp;
    if (!c || c.reply || this.cmpSending) return;
    this.cmpSending = true;
    this.setState((p) => ({ screen: "compose", noPal: false, cmp: p.cmp && { ...p.cmp, step: 3, busy: true, inviting: true, err: "" } }));
    try {
      const me = await this.ensureMe(c);
      const photo = c.photo ? await toUploadJpeg(dataUrlToBlob(c.photo)) : null;
      const inv = await api.createInvite(me.id, c.clientId || newId(), { body: (c.text || "").trim().slice(0, 500) || null, stamp: c.stamp || 0, sign: this.cmpSignName(c) || me.nickname, kind: c.kind || "my_cat" }, photo);
      clearDraft();   // it's gone as a link now (kept in Sent, as "link shared"), not a draft
      this.setState((p) => ({ cmp: p.cmp && { ...p.cmp, busy: false, inviting: false, err: "", step: 4, invite: { id: inv.id, token: inv.token, photo_path: inv.photo_path, url: inviteUrl(inv.token), copied: false } } }));
      this.loadInvites();
    } catch (e) {
      this.setState((p) => ({ cmp: p.cmp && { ...p.cmp, busy: false, inviting: false, err: api.isMissingFeature(e) ? this.tx("ivMissing") : api.errorText(e) } }));
    } finally { this.cmpSending = false; }
  }
  /** the link, to a friend: the device's share sheet where there is one (WhatsApp, Instagram DM, KakaoTalk…), else copied */
  async shareInvite() {
    const inv = this.state.cmp?.invite; if (!inv) return;
    const text = this.tx("ivShareText");
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title: "Cat Pal", text, url: inv.url }); return; } catch (e: any) { if (e && e.name === "AbortError") return; }
    }
    this.copyInvite();
  }
  async copyInvite() {
    const inv = this.state.cmp?.invite; if (!inv) return;
    let ok = false;
    try { await navigator.clipboard.writeText(inv.url); ok = true; } catch (_) {
      try { const t = document.createElement("textarea"); t.value = inv.url; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); ok = document.execCommand("copy"); t.remove(); } catch (__) { ok = false; }
    }
    this.setState((p) => ({ cmp: p.cmp && p.cmp.invite && { ...p.cmp, err: ok ? "" : this.tx("ivCopyFail"), invite: { ...p.cmp.invite, copied: ok } } }));
  }
  /** Sent › a letter sent as a link: its link again (to share or cancel) */
  openInviteCard(inv: api.Invite) {
    const me = this.state.me; if (!me) return;
    const cmp = { step: 4, text: inv.body || "", photo: inv.photo_path ? api.invitePhotoUrl(inv.photo_path) : "", catName: inv.sign || "", penName: inv.sign || "", kind: inv.cat_kind, country: me.country, stamp: inv.stamp || 0,
      open: true, busy: false, err: "", invite: { id: inv.id, token: inv.token, photo_path: inv.photo_path, url: inviteUrl(inv.token), copied: false, opened: !!inv.opened_at } };
    this.go("compose", { sheet: null, cmp });
  }
  async revokeInvite() {
    const inv = this.state.cmp?.invite; if (!inv || !window.confirm(this.tx("ivConfirmCancel"))) return;
    try { await api.revokeInvite(inv); this.setState((p) => ({ invites: p.invites.filter((x) => x.id !== inv.id) })); this.go("mailbox", { sheet: null, mbTab: "sent", cmp: null }); }
    catch (e) { this.setCmp({ err: api.errorText(e) }); }
  }
  /** no one to match: keep the letter (as it was, sealed and ready) for later — Home has it ("Continue my letter") */
  saveForLater() {
    const c = this.state.cmp; if (c) writeDraft({ ...c, step: 3, open: false, busy: false, err: "" });
    this.go("home", { sheet: null, noPal: false });
  }

  // ---------------------------------------------------------------- a letter that came to you by link
  /** read it (no sign-in needed); then the envelope to open. A reply being written to it before (a reload, signing in) comes back. */
  async loadInvite() {
    const inv = this.state.inv; if (!inv) return;
    this.setState({ inv: { ...inv, phase: "loading" } });
    try {
      const d = await api.readInvite(inv.token);
      this.setState({ inv: { token: inv.token, phase: d && d.status === "ok" ? "ready" : "gone", d } });
      const saved = readJSON(INV_DRAFT);
      if (d && d.status === "ok" && saved && saved.reply && saved.reply.invite === inv.token && saved.open && !d.mine && !d.claimed_by_me) {
        this.go("compose", { sheet: null, cmp: { ...saved, busy: false, err: "" } });
      }
    } catch (e) {
      this.setState({ inv: { ...inv, phase: "error", err: api.isMissingFeature(e) ? this.tx("ivMissing") : api.errorText(e) } });
    }
  }
  /** "Write back": the usual letter (in reply), to the one who sent it; signing in happens as it's sent */
  async inviteWriteBack() {
    const inv = this.state.inv, d = inv && inv.d; if (!d || d.status !== "ok" || d.mine) return;
    // written back before (this same person): on in their thread, as any letter
    if (d.claimed_by_me && d.thread_id) {
      await this.refreshMail();
      const l = [...(this.state.letters as Letter[])].reverse().find((x) => x.thread_id === d.thread_id && x.sender_id !== this.state.me?.id);
      dropInviteParam(); this.setState({ inv: null });
      if (l) this.writeBack(l); else this.go("mailbox", { sheet: null, mbTab: "received" });
      return;
    }
    const saved = readJSON(INV_DRAFT), me = this.state.me, cat = catInfo(me, this.state.mine);
    const cmp = saved && saved.reply && saved.reply.invite === inv.token ? { ...saved, open: true, busy: false, err: "" } : {
      step: 1, text: "", photo: "", catName: me ? cat.name : "", penName: "", kind: "my_cat", country: me?.country || guessCountry() || "", stamp: Math.floor(Math.random() * STAMPS.length), open: true, busy: false, err: "",
      reply: { invite: inv.token, name: d.sender_nickname || "", cc: d.sender_country || "", photo: d.photo_path ? api.invitePhotoUrl(d.photo_path) : "", said: (d.body || "").trim() } };
    writeDraft(cmp);
    this.go("compose", { sheet: null, cmp });
    this.pushLetterStep();
  }
  // ---------------------------------------------------------------- "start with a friend?" (a personal cat pal link)
  /** "Invite a friend": my personal link (a session is made for it if there isn't one — no form), then the device's
   *  share sheet; where there's none (or it can't open now), the link to copy. Sharing connects no one: only the
   *  friend's accepting does, and nothing here waits for it. */
  async palInviteShare() {
    const p = this.state.palShare || {};
    if (p.phase === "making") return;
    let url = p.url;
    if (!url) {
      this.setState({ palShare: { ...p, phase: "making", err: "" } });
      try {
        if (!(await api.currentUserId())) await api.signInAnonymously();
        url = palUrl(await api.myPalInvite());
      } catch (e) {
        this.setState({ palShare: { phase: "idle", err: api.isMissingFeature(e) ? this.tx("palMissing") : api.errorText(e) } });
        return;
      }
    }
    // the message, in the app's language: its title, its line and the link, as one text — given the link apart, chat
    // apps (KakaoTalk, WhatsApp…) often keep only the link and drop the words
    const title = this.tx("palShareTitle"), text = title + "\n" + this.tx("palShareText");
    this.setState({ palShare: { ...this.state.palShare, phase: "ready", url } });
    // KakaoTalk, as a card with a button to the link (when the app has a Kakao key); the link stays here to copy too
    if (kakaoConfigured && await shareKakao({ title, description: this.tx("palShareText"), button: this.tx("palShareButton"), url, imageUrl: location.origin + "/og-image.jpg" })) return;
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ text: text + "\n" + url }); this.setState({ palShare: { ...this.state.palShare, sent: true } }); return; }
      catch (e: any) { if (e && e.name === "AbortError") return; /* couldn't open now (no gesture left): the link shows, with its buttons */ }
    }
    this.setState({ palShare: { ...this.state.palShare, noSheet: !(navigator as any).share } });
  }
  async palCopy() {
    const p = this.state.palShare; if (!p?.url) return;
    let ok = false;
    try { await navigator.clipboard.writeText(this.tx("palShareTitle") + "\n" + this.tx("palShareText") + "\n" + p.url); ok = true; } catch (_) {
      try { const t = document.createElement("textarea"); t.value = p.url; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); ok = document.execCommand("copy"); t.remove(); } catch (__) { ok = false; }
    }
    this.setState({ palShare: { ...p, copied: ok, sent: p.sent || ok, err: ok ? "" : this.tx("ivCopyFail") } });
  }
  /** on to Home (as from the story before) */
  palStartDone() { this.go("home", { sheet: null, palShare: null }); }

  /** a friend's link: who invited you (their cat's name and country, once they have them) */
  async loadPalInvite() {
    const inv = this.state.palInv; if (!inv) return;
    try {
      const d = await api.readPalInvite(inv.token);
      this.setState({ palInv: { ...inv, phase: d && d.status === "ok" ? (d.linked ? "accepted" : "ready") : d && d.status === "mine" ? "mine" : "gone", d } });
    } catch (e) {
      this.setState({ palInv: { ...inv, phase: "error", err: api.isMissingFeature(e) ? this.tx("palMissing") : api.errorText(e) } });
    }
  }
  /** "Accept": a session if there isn't one (no form), then the link — you're cat pals; your thread comes as soon as you both have a profile */
  async palAccept() {
    const inv = this.state.palInv; if (!inv || inv.phase !== "ready" || inv.busy) return;
    this.setState({ palInv: { ...inv, busy: true, err: "" } });
    try {
      if (!(await api.currentUserId())) await api.signInAnonymously();
      const thread = await api.acceptPalInvite(inv.token);
      dropPal();
      this.setState({ palInv: { ...this.state.palInv, busy: false, phase: "accepted", thread } });
      if (this.state.me) await this.refreshMail();
    } catch (e) {
      this.setState({ palInv: { ...this.state.palInv, busy: false, err: api.errorText(e) } });
    }
  }
  /** "Send the first letter": the usual letter paper, to them — in your thread if it's there, else it's made as it's sent */
  palFirstLetter() {
    const inv = this.state.palInv, d = inv?.d; if (!d) return;
    const me = this.state.me;
    const th = me ? (this.state.threads as Thread[]).find((t) => !t.moment_id && this.otherOf(t).id === d.inviter_id) : null;
    this.setState({ palInv: null });
    if (th) { this.setState({ threadId: th.id, pendingMoment: null }); this.writeIn(); return; }
    const cat = catInfo(me, this.state.mine);
    const cmp = { step: 1, text: "", photo: "", catName: me ? cat.name : "", penName: "", kind: "my_cat", country: me?.country || guessCountry() || "", stamp: Math.floor(Math.random() * STAMPS.length), waiting: false, open: true, busy: false, err: "",
      reply: { pal: d.inviter_id, threadId: null, name: d.nickname || "", cc: d.country || "", photo: d.photo_path ? api.momentPhotoUrl(d.photo_path) : "", said: "" } };
    this.go("compose", { sheet: null, cmp });
    this.pushLetterStep();
  }
  /** not now: on into the app (the link can be opened again) */
  palLater() { dropPal(); this.go("home", { sheet: null, palInv: null }); }

  /** out of the letter-by-link page, into the app */
  leaveInvite() { dropInviteParam(); this.setState({ inv: null }); this.go("home", { sheet: null }); }

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
    let s = D[k] ?? DE[k] ?? k;
    if (v) {
      // "{name:이/가}": the name with the particle that fits it ("보리가", "구름이")
      s = s.replace(/\{(\w+):([^/{}]+)\/([^{}]+)\}/g, (all, n, a, b) => (n in v ? String(v[n]) + josa(String(v[n]), a, b) : all));
      for (const n in v) s = s.split("{" + n + "}").join(String(v[n]));
    }
    return s;
  }

  renderVals() {
    const st = this.state;
    const LANGS = LANG_LIST;
    const propLang = (LANGS.find((x) => x[1] === this.props.language) || LANGS[0])[0];
    const L = st.lang ?? propLang;
    this.L = L;
    const LOC = (LANGS.find((x) => x[0] === L) || LANGS[0])[2];
    // dates, one way everywhere (./community/dates): a day for details, "5분 전" in lists for the last 24 hours
    const day = (iso) => fmtDate(iso, L, LOC), when = (iso) => fmtListTime(iso, L, LOC);
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
    // a cat pal by link (accepted) is a pal from the start, letters or not
    const palSet = new Set<string>(st.palThreads || []);
    const threads: Thread[] = me ? st.threads.filter((t) => byThread[t.id] || t.id === st.threadId || palSet.has(t.id)) : [];
    const otherOf = (t) => (t.starter_id === me.id ? t.owner : t.starter);
    const unreadOf = (t) => (byThread[t.id] || []).filter((l) => l.sender_id !== me.id && !l.read_at).length;
    const unread = me ? letters.filter((l) => l.sender_id !== me.id && !l.read_at) : [];
    // "?mbSample=1": the Mailbox's sample letters, one of them new — so Home's mailbox and the nav show it too
    const unreadN = MB_SAMPLE ? Math.max(1, unread.length) : unread.length;
    const threadById = Object.fromEntries(threads.map((t) => [t.id, t]));
    // People I've exchanged letters with, newest activity first.
    const pals: { p: Profile; threads: Thread[]; last: string; first: string; wroteMe: Letter | null; iWrote: boolean; n: number; photo: string }[] = [];
    for (const t of threads) {
      const o = otherOf(t), ls = byThread[t.id] || [];
      if (!ls.length && !palSet.has(t.id)) continue;
      let e = pals.find((x) => x.p.id === o.id);
      if (!e) pals.push((e = { p: o, threads: [], last: "", first: ls[0]?.created_at || t.created_at, wroteMe: null, iWrote: false, n: 0, photo: "" }));
      e.threads.push(t); e.n += ls.length;
      if (ls.length && ls[ls.length - 1].created_at > e.last) e.last = ls[ls.length - 1].created_at;
      if (!e.last) e.last = t.created_at;
      if (ls.length && ls[0].created_at < e.first) e.first = ls[0].created_at;
      if (ls.some((l) => l.sender_id === me.id)) e.iWrote = true;
      for (const l of ls) if (l.sender_id !== me.id && l.read_at && (!e.wroteMe || l.created_at < e.wroteMe.created_at)) e.wroteMe = l;
      if (!e.photo && t.moment && t.moment.photo_path && t.owner_id === o.id) e.photo = photoOf(t.moment);
    }
    pals.sort((a, b) => (a.last < b.last ? 1 : -1));
    const latestThreadWith = (uid) => { const e = pals.find((x) => x.p.id === uid); if (!e) return null; return e.threads.slice().sort((a, b) => { const la = (byThread[a.id] || []).slice(-1)[0], lb = (byThread[b.id] || []).slice(-1)[0]; return (la?.created_at || "") < (lb?.created_at || "") ? 1 : -1; })[0]; };
    const palRows = pals.map((e) => ({
      id: e.p.id, slot: "pal-" + e.p.id, img: e.photo, name: e.p.nickname, flag: flagOf(e.p.country), city: cName(e.p.country), dist: km(myCC, e.p.country),
      meta: tx("palMeta", { n: e.n, since: day(e.first) }),
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
        rot: [-1.2, 0.8, -0.6, 1.1, -0.9, 0.5][i % 6], date: day(m.created_at),
      };
    };

    // ---- nav
    const backMap = { onboard: st.prev === "home" ? "home" : "intro", share: "home", catmap: st.prev === "explore" ? "explore" : "home", mailbox: st.prev === "passport" ? "passport" : "home", map: "passport", camera: st.photoFor === "compose" ? "compose" : st.photoFor === "letter" ? "letters" : st.sharePhoto ? "share" : "home", letters: st.prev && !["letters", "camera", "arrived", "deliveryMap"].includes(st.prev) ? st.prev : "mailbox" };
    // Home (send a letter) · Map (the globe, countries, the feed and its Top 10) · Mailbox (letters) · My Cat (profile, stamps, records)
    const navActive = { home: "home", catmap: "world", explore: "world", mailbox: "mailbox", passport: "mycat", map: "mycat" }[cur];
    const tabs = [
      { id: "home", label: tx("navHome"), tap: () => { this.go("home", { sheet: null }); if (cur === "home") { this.loadFeed(); this.loadMap(); } } },
      { id: "world", label: tx("navWorld"), tap: () => { this.go("catmap", { sheet: null, cmSel: null, cmRoute: null, cmList: null }); this.loadMap(); this.loadExplore(); } },
      { id: "mailbox", label: tx("navMailbox"), count: unreadN, tap: () => { this.go("mailbox", { sheet: null, mbTab: "received" }); this.refreshMail(); } },
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
        ? { who: tx("toPrefix", { name: o.nickname }), place: flagOf(o.country) + " " + cName(o.country) + (km(myCC, o.country) ? " · " + km(myCC, o.country) : ""), date: day(l.created_at), stamp: STAMPS[l.stamp] || STAMPS[0], pm: postmarkOf(myCC), isNew: false, locked: false, open: () => this.openThread(l.thread_id) }
        : { who: tx("fromPrefix", { name: o.nickname }), place: flagOf(o.country) + " " + cName(o.country), date: day(l.created_at), stamp: STAMPS[l.stamp] || STAMPS[0], pm: postmarkOf(o.country), isNew: !l.read_at, locked: false, open: () => this.openThread(l.thread_id) };
    });
    // ---- the Mailbox (MailboxScreen): received letters as envelopes, sent ones as postcards, CatPals as an address book
    const shortDate = (iso) => when(iso);
    const latestMomentOf = (uid) => photoOf((st.mapMoments as MomentCard[]).find((m) => m.user_id === uid) || st.feed.find((m: MomentCard) => m.user_id === uid));
    const mailOf = (l: Letter, mine: boolean) => {
      const th = threadById[l.thread_id], o = otherOf(th), lp = l.photo_path ? st.urls[l.photo_path] || "" : "";
      return {
        key: l.id, name: o.nickname, flag: flagOf(o.country), country: cName(o.country), date: shortDate(l.created_at),
        photo: lp || (mine ? photoOf(st.mine[0]) : latestMomentOf(o.id)) || (th.moment && th.owner_id === o.id ? photoOf(th.moment) : ""),
        stamp: mine ? STAMPS[l.stamp] || STAMPS[0] : stampOf(o.country), pm: postmarkOf(mine ? myCC : o.country),
        isNew: !mine && !l.read_at, status: mine ? (l.read_at ? "read" : "delivered") : "", statusLabel: mine ? tx(l.read_at ? "stRead" : "stDelivered") : "",
        // to read it (received): the words, when, where from
        id: l.id, cc: o.country, body: l.body || "", dateLong: day(l.created_at),
        open: mine ? () => this.openThread(l.thread_id) : () => this.openLetter(l),
      };
    };
    const mbReceived = me ? received.filter((l) => threadById[l.thread_id]).map((l) => mailOf(l, false)) : [];
    const sentLetters = me ? sentL.filter((l) => threadById[l.thread_id]).map((l) => mailOf(l, true)) : [];
    // letters gone as links, not delivered yet (no friend has written back): "link shared", or "opened" once looked at
    const linkCards = (st.invites as api.Invite[]).filter((x) => !x.claimed_at && !x.revoked_at && new Date(x.expires_at).getTime() > Date.now()).map((x) => ({
      key: "inv-" + x.id, invite: true, name: tx("mbAFriend"), flag: "🔗", country: tx("mbByLink"), date: shortDate(x.created_at), at: x.created_at,
      photo: x.photo_path ? api.invitePhotoUrl(x.photo_path) : "", status: x.opened_at ? "opened" : "link", statusLabel: tx(x.opened_at ? "stOpened" : "stLink"), open: () => this.openInviteCard(x),
    }));
    const mbSent = [...linkCards, ...sentLetters.map((m, i) => ({ ...m, at: sentL.filter((l) => threadById[l.thread_id])[i].created_at }))].sort((a, b) => (a.at < b.at ? 1 : -1));
    const mbPals = pals.map((e, i) => {
      // with this friend: their country's stamp (a letter of theirs opened) and postmark (written back to); whose turn it is
      const ls = e.threads.flatMap((t) => byThread[t.id] || []).sort((x, y) => (x.created_at < y.created_at ? -1 : 1));
      const last = ls[ls.length - 1], theirs = [...ls].reverse().find((l) => l.sender_id !== me.id);
      const marked = ls.some((l) => l.sender_id === me.id && ls.some((x) => x.sender_id !== me.id && x.created_at < l.created_at));
      // a new pal by link: no letters yet — the first one is yours to write
      if (!e.n) return { ...palRows[i], country: cName(e.p.country), n: 0, lettersLabel: tx("mbNewPal"), pm: postmarkOf(e.p.country), photo: e.photo || latestMomentOf(e.p.id),
        stampImg: stampOf(e.p.country), hasStamp: false, hasMark: false, yourTurn: true, turnLabel: tx("mbFirstLetter"),
        open: () => { this.setState({ threadId: e.threads[0].id, pendingMoment: null }); this.writeIn(); }, writeBack: () => { this.setState({ threadId: e.threads[0].id, pendingMoment: null }); this.writeIn(); } };
      return { ...palRows[i], country: cName(e.p.country), n: e.n, lettersLabel: tx("mbLetters", { n: e.n, w: tx(e.n === 1 ? "wLetter" : "wLetters") }), pm: postmarkOf(e.p.country), photo: e.photo || latestMomentOf(e.p.id),
        stampImg: stampOf(e.p.country), hasStamp: !!e.wroteMe, hasMark: marked, yourTurn: !!last && last.sender_id !== me.id,
        writeBack: theirs ? () => this.writeBack(theirs) : null };
    });
    const unreadThreads = threads.filter((t) => unreadOf(t) > 0).length;
    // Home: the latest letter with anyone (theirs: is it read, so it's your turn? yours: reached, or read)
    const homeLast = (() => {
      if (!me) return null;
      let last: Letter | null = null;
      for (const l of letters) if (threadById[l.thread_id] && (!last || l.created_at > last.created_at)) last = l;
      if (!last) return null;
      const o = otherOf(threadById[last.thread_id]);
      return { name: o.nickname, theirs: last.sender_id !== me.id, read: !!last.read_at, letter: last };
    })();
    const homeTurn = homeLast && homeLast.theirs && homeLast.read ? homeLast : null;
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
      // the collection, from the real letters only: a country's STAMP comes with the first letter from there that you
      // opened; its POSTMARK with your first letter back to it (a letter of yours after one of theirs, in a thread).
      // One of each per country, however many letters; the letters shared with it are counted.
      const sample = PP_SAMPLE && !received.some((l) => l.read_at);
      type C = { stampIso: string; markIso: string; n: number; pals: Map<string, { name: string; photo: string; n: number; open: (() => void) | null }> };
      const by = new Map<string, C>();
      const cOf = (cc: string) => by.get(cc) || (by.set(cc, { stampIso: "", markIso: "", n: 0, pals: new Map() }), by.get(cc)!);
      if (sample) SAMPLE_PALS.forEach(([cc, who, , k, s2, r2], i) => {
        if (!r2) return;
        const c = cOf(cc), t = Date.now() - (i * 4 + 2) * 86400000;
        c.stampIso = new Date(t).toISOString(); if (s2) c.markIso = new Date(t + 86400000).toISOString(); c.n = s2 + r2;
        c.pals.set(who, { name: who, photo: "./assets/cats/cat-" + k + ".jpg", n: s2 + r2, open: null });
      });
      else if (me) for (const th of threads) {
        const o = otherOf(th), ls = byThread[th.id] || [], c = cOf(o.country);
        c.n += ls.length;
        const p = c.pals.get(o.id) || { name: o.nickname, photo: "", n: 0, open: () => this.openThread(th.id) };
        p.n += ls.length; c.pals.set(o.id, p);
        for (const l of ls) {
          if (l.sender_id !== me.id && l.read_at && (!c.stampIso || l.read_at < c.stampIso)) c.stampIso = l.read_at;
          if (l.sender_id === me.id && ls.some((x) => x.sender_id !== me.id && x.created_at < l.created_at) && (!c.markIso || l.created_at < c.markIso)) c.markIso = l.created_at;
        }
      }
      for (const [, c] of by) for (const [uid, p] of c.pals) if (!p.photo) p.photo = latestMomentOf(uid) || "";
      const short = (iso: string) => (iso ? day(iso) : "");
      // the pages: the countries with a postmark of their own (the app's own postmark art); your own country is in the folder
      const all = POSTMARK_COUNTRIES.filter((cc) => cc !== (myCC || (sample ? "KR" : "")) || by.get(cc)?.stampIso);
      const stamps = all.map((cc, i) => {
        const c = by.get(cc), got = !!c?.stampIso, mark = !!c?.markIso, pl = c ? [...c.pals.values()] : [];
        return { cc, name: cName(cc), en: countryName(cc).toUpperCase(), img: postmarkOf(cc), stampImg: stampOf(cc), got, mark,
          iso: c?.stampIso || "", from: pl[0]?.name || "", n: c?.n || 0, stampDate: short(c?.stampIso || ""), markDate: short(c?.markIso || ""),
          open: got ? () => this.setState({ ppCountry: cc }) : null, rot: [-8, 6, -3, 10, -6, 4, -11, 7, -4, 9, -2, 5][i % 12] };
      }).sort((a, b) => Number(b.got) - Number(a.got) || Number(b.mark) - Number(a.mark));
      const n = stamps.filter((x) => x.got).length, marks = stamps.filter((x) => x.mark).length;
      const countries = sample ? SAMPLE_PALS.length : palCountries, palsN = sample ? SAMPLE_PALS.length : pals.length;
      // a country opened from the page: its stamp and postmark, the letters shared, its cat pals
      const open = st.ppCountry ? stamps.find((x) => x.cc === st.ppCountry) : null, oc = open ? by.get(open.cc) : null;
      return {
        ppSample: sample, ppStamps: stamps, ppGot: n, ppMarks: marks, ppTotal: stamps.length,
        // CatPals in the folder opens them: each cat pal, and a letter to them right there
        ppCounts: [{ n: countries, l: tx("ppCountries"), toPage: true }, { n: palsN, l: tx("ppPals"), open: palsN ? () => this.setState({ ppPals: true }) : null }, { n, l: tx("ppStamps") }],
        ppPalList: !st.ppPals ? null : {
          title: tx("ppPalsTitle"), send: tx("ppSendLetter"), close: () => this.setState({ ppPals: false }), sampleNote: sample ? tx("mbSampleWrite") : "",
          pals: sample
            ? SAMPLE_PALS.map(([cc, name, , ph, s2, r2]) => ({ key: "s-" + cc, name, flag: flagOf(cc), country: cName(cc), photo: "./assets/cats/cat-" + ph + ".jpg", nText: tx((s2 + r2) === 1 ? "ppLetter1" : "ppLetters", { n: s2 + r2 }),
                open: null, write: () => { this.setState({ ppPals: false }); this.sampleWriteBack({ name, cc, photo: "./assets/cats/cat-" + ph + ".jpg", body: "" }); } }))
            : [...pals].sort((a, b) => (a.last < b.last ? 1 : -1)).map((e) => {
                const t = latestThreadWith(e.p.id);
                return { key: e.p.id, name: e.p.nickname, flag: flagOf(e.p.country), country: cName(e.p.country), photo: e.photo || latestMomentOf(e.p.id), nText: tx((e.n) === 1 ? "ppLetter1" : "ppLetters", { n: e.n }),
                  open: t ? () => { this.setState({ ppPals: false }); this.openThread(t.id); } : null,
                  write: () => { if (!t) return; this.setState({ ppPals: false, threadId: t.id, pendingMoment: null }); this.writeIn(); } };
              }),
        },
        ppProgress: tx("ppProgress", { n, total: stamps.length }), ppCollected: tx("ppCollected", { n: String(n).padStart(2, "0"), total: String(stamps.length).padStart(2, "0") }),
        ppMarksText: tx("ppMarksText", { n: String(marks).padStart(2, "0") }),
        ppSheet: open ? {
          ...open, flag: flagOf(open.cc), lettersText: tx((open.n) === 1 ? "ppLetter1" : "ppLetters", { n: open.n }),
          stampLine: tx("ppStampGot", { date: open.stampDate }), markLine: open.mark ? tx("ppMarkGot", { date: open.markDate }) : tx("ppMarkYet"),
          pals: oc ? [...oc.pals.values()].map((p) => ({ ...p, lettersText: tx((p.n) === 1 ? "ppLetter1" : "ppLetters", { n: p.n }) })) : [],
          close: () => this.setState({ ppCountry: null }),
        } : null,
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
    const fmtDay = (iso) => day(iso);
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
      message: it.message || "", catName: it.cat_name || "", time: when(it.created_at), likes: it.like_count, week: it.week_likes, weekText: tx("xWeek", { n: it.week_likes }),
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
    // my CatPals are always on the map (teal ring); other active cat lovers join them (white ring)
    const latestPhotoOf = (uid) => { const m = (st.mapMoments as MomentCard[]).find((x) => x.user_id === uid); return m ? photoOf(m) : ""; };
    // where they are: their country (no finer place is known, so none is made up)
    const pinAt = (_uid, cc) => ({ lon: COUNTRY_COORDS[cc][0], lat: COUNTRY_COORDS[cc][1] });
    const palPins = pals.filter((e) => COUNTRY_COORDS[e.p.country]).map((e) => ({ id: e.p.id, cc: e.p.country, count: 1, kind: "pal", photo: (actMap[e.p.id] && actMap[e.p.id].photo) || e.photo || latestPhotoOf(e.p.id), ...pinAt(e.p.id, e.p.country) }));
    const palIds = new Set(palPins.map((x) => x.id));
    const activePins = [...palPins, ...Object.values(actMap).filter((a: any) => !palIds.has(a.uid)).map((a: any) => ({ id: a.uid, cc: a.cc, count: 1, kind: "active", photo: a.photo, ...pinAt(a.uid, a.cc) }))];
    const activeWeek = Object.values(actMap).filter((a: any) => nowMs - a.t <= 7 * 864e5);
    const activeCountries = new Set(activeWeek.map((a: any) => a.cc)).size;
    const draftOpen = st.cmp ? started(st.cmp) : hasDraft();
    const home2 = {
      activePins,
      mtActive: !activePins.length ? tx("mtEmpty") : activeWeek.length ? tx("mtActive", { n: activeWeek.length, lw: tx(activeWeek.length === 1 ? "wLover" : "wLovers"), c: activeCountries, cw: tx(activeCountries === 1 ? "wCountry" : "wCountries") }) : tx("mtSub", { c: new Set(activePins.map((x) => x.cc)).size, cw: tx(new Set(activePins.map((x) => x.cc)).size === 1 ? "wCountry" : "wCountries") }),
      mbHasNew: unreadN > 0, mbCount: unreadN,
      // Home's mailbox chip: the mailbox's own state — new mail, or none yet
      mbTitle: unreadN ? tx("mbNew") : tx("mbNone"),
      mbTurn: false,
      mbSub: unreadN ? tx("mbNewSub", { n: unreadN, lw: tx(unreadN === 1 ? "wLetter" : "wLetters") }) : tx("mbNoneSub"),
      mtSub: cmGroups.length ? tx("mtSub", { c: cmGroups.length, cw: tx(cmGroups.length === 1 ? "wCountry" : "wCountries") }) : tx("mtEmpty"),
      hasPals: pals.length > 0, palAvatars: pals.map((e) => e.photo).filter(Boolean).slice(0, 3),
      palsText: tx("mtPals", { n: pals.length, nw: tx(pals.length === 1 ? "wPal" : "wPals") }), sentCount: sentL.length, recvCount: received.length,
      findPal: () => this.findPal(), palPhase: pal ? pal.phase : null, palCc: pal && pal.phase === "spin" ? pal.cc : pal && pal.phase === "found" ? pal.cc : null,
      palCard: palM ? { ...mini(palM), catName: palM.cat_name || "", key: pal.key } : null,
      palWrite: () => { const m = palM; this.setState({ pal: null }); m && this.letterTo(m); }, palClose: () => { clearInterval(this.palSpin); this.setState({ pal: null }); },
      gmCards: byPopular.slice(0, 8).map(mini), hasGm: byPopular.length > 0, goExplore: () => { this.go("explore", { sheet: null }); this.loadExplore(); },
      goLetters: () => { this.go("mailbox", { sheet: null, mbTab: "received" }); this.refreshMail(); },
      goLetterMap: () => this.go("map", { sheet: null }),
      hmHead: tx("hmHead"), hmSub: tx("hmSub"), hmCta: draftOpen ? tx("hmCtaDraft") : homeTurn ? tx("mbWriteBack", { name: homeTurn.name }) : tx(sentL.length ? "hmCta" : "hmCtaFirst"),
      // your turn with a cat pal (their letter read, not answered yet): Home's button writes back; a new cat pal is one link below
      hmTurn: !draftOpen && !!homeTurn, hmLetterToName: !draftOpen && homeTurn ? tx("cpDearName", { name: homeTurn.name }) : "", hmNewPal: tx("hmNewPal"), hmNewPalGo: () => this.openCompose(), hmEnvelope: tx("hmEnvelope"), hmLetterTo: tx("hmLetterTo"), hmLetterLine: tx("hmLetterLine"), startLetter: () => (!draftOpen && homeTurn ? this.writeBack(homeTurn.letter) : this.openCompose()),
      cmFeedLink: tx("cmFeedLink"), dmTitle: tx("dmTitle"),
      todayMode: !!st.todayMode, skipToday: () => this.go("home", { sheet: null, todayMode: false }),
      exTab: st.exTab, exTabs: [["latest", tx("exLatest")], ["popular", tx("exPopular")]].map(([id, label]) => ({ id, label, on: st.exTab === id, tap: () => this.setState({ exTab: id }) })),
      exCards: (st.exTab === "popular" ? byPopular : (st.mapMoments as MomentCard[])).map(mini),
      exLoading: !st.mapMoments.length && st.feedState === "loading",
    };

    // my cat pals, for "Send to" on the letter's preview (most recent first)
    const homePals = me ? [...pals].sort((a, b) => (a.last < b.last ? 1 : -1)).map((e) => ({ id: e.p.id, name: e.p.nickname, cc: e.p.country, flag: flagOf(e.p.country), photo: e.photo || latestMomentOf(e.p.id) })) : [];
    const myLatest = st.mine[0];
    // ---- the letter from Home (see openCompose)
    const c = st.cmp, cCC = c ? c.country : "";
    const cmpVals = !c ? { sCompose: false } : {
      cpT: { ...Object.fromEntries(CP_KEYS.map((k) => [k, tx(k)])), ...(c.reply ? { cpDear: tx("cpDearName", { name: c.reply.name }), cpMsgPh: tx("cpReplyPh", { name: c.reply.name }) } : c.kind === "met_cat" ? { cpMsgPh: tx("cpMsgPhMet") } : {}),
        // to a cat pal picked by name: to them, not "a new friend"
        ...(!c.reply && c.to && homePals.find((p) => p.id === c.to) ? { cpDear: tx("cpDearName", { name: homePals.find((p) => p.id === c.to)!.name }) } : {}) },
      sCompose: cur === "compose", cmpStep: c.step, cmpBusy: !!c.busy, cmpErr: c.err || "", cmpWaiting: !!c.waiting,
      cmpText: c.text, cmpPhoto: c.photo, cmpCatName: c.catName, cmpCountry: cCC, cmpTextMax: 500,
      cmpFlag: cCC ? flagOf(cCC) : "🌏", cmpCountryName: cCC ? cName(cCC) : "", cmpPm: cCC ? postmarkOf(cCC) : "", cmpStamp: STAMPS[c.stamp || 0],
      cmpCanNext: c.step === 1 ? !!c.photo && !!c.text.trim() : c.step === 2 ? !!this.cmpSignName(c) && !!cCC : true,
      // whose cat it is (asked once there's a photo, and only lightly): yours, or one you met — that one needs no profile
      cmpMet: c.kind === "met_cat",
      cmpKinds: [["my_cat", tx("cpKindMine")], ["met_cat", tx("cpKindMet")]].map(([id, label]) => ({ id, label, on: (c.kind || "my_cat") === id, tap: () => this.setCmp({ kind: id, err: "" }) })),
      cmpPenName: c.penName || "", setCmpPen: (e) => this.setCmp({ penName: e.target.value.slice(0, 24), err: "" }),
      // who it goes to (a new letter, once you have cat pals): a new cat pal at random (as before), or one you have
      cmpTo: c.reply || !homePals.length ? null : {
        label: tx("cpSendTo"),
        options: [{ id: "", name: tx("cpToRandom"), photo: "", flag: "🎲", on: !c.to, tap: () => this.setCmp({ to: null, err: "" }) },
          ...homePals.map((p) => ({ id: p.id, name: p.name, photo: p.photo, flag: p.flag, on: c.to === p.id, tap: () => this.setCmp({ to: p.id, err: "" }) }))],
        sendLabel: c.to ? tx("cpSendToName", { name: (homePals.find((p) => p.id === c.to) || { name: "" }).name }) : "", busyLabel: c.to ? tx("cpSendingPal") : "",
      },
      // the last step, when it's going to someone you know (a reply, or a cat pal picked): not "a new Cat Pal"
      cmpS3: (() => { const p = c.reply ? { name: c.reply.name, cc: c.reply.cc } : c.to ? homePals.find((x) => x.id === c.to) : null;
        return p && p.name ? { title: tx("cpS3ToTitle", { name: p.name }), sub: tx("cpS3ToSub", { name: p.name }) } : null; })(),
      // a link being made (from the Map, when there's no one to match yet)
      cmpRouteInvite: !c.reply && !!c.inviting, cmpInvite: () => this.cmpInvite(),
      // the link (step 4): made, to share; not delivered until a friend writes back
      cmpLink: c.invite ? { url: c.invite.url, copied: !!c.invite.copied, opened: !!c.invite.opened, canShare: typeof navigator !== "undefined" && !!(navigator as any).share,
        share: () => this.shareInvite(), copy: () => this.copyInvite(), cancel: () => this.revokeInvite(), done: () => this.cmpClose() } : null,
      // a reply: to whom, and their letter (to keep in view while writing back)
      cmpReply: c.reply ? { ...c.reply, flag: flagOf(c.reply.cc), country: cName(c.reply.cc), stamp: c.reply.cc ? stampOf(c.reply.cc) : "", pm: c.reply.cc ? postmarkOf(c.reply.cc) : "",
        date: c.reply.dateText || (c.reply.at ? day(c.reply.at) : ""), again: tx("cpReadAgain", { name: c.reply.name }), title: tx(c.reply.pal ? "palWriteTitle" : c.reply.mode === "write" ? "lWriteTo" : "cpReplyTitle", { name: c.reply.name }), sub: tx(c.reply.pal ? "palWriteSub" : "cpReplySub", { name: c.reply.name }), re: tx("cpReplyRe", { name: c.reply.name }) } : null,
      cmpSign: this.cmpSignName(c) || tx(c.kind === "met_cat" ? "cpACatLover" : "cpYourCat"),
      cmpFromLine: tx("cpFromLine", { name: this.cmpSignName(c) || tx("cpYourCat"), flag: cCC ? flagOf(cCC) : "", country: cCC ? cName(cCC) : "" }),
      setCmpText: (e) => this.setCmp({ text: e.target.value.slice(0, 500), err: "" }),
      setCmpCat: (e) => this.setCmp({ catName: e.target.value.slice(0, 24), err: "" }),
      setCmpCountry: (e) => this.setCmp({ country: e.target.value, err: "" }),
      cmpPickPhoto: () => this.setState({ sheet: "photo", photoFor: "compose" }),
      // a few ways to begin: tapping one writes just the start of a sentence about your cat (by name once it has one)
      // on the letter, on a new line after what's already there (which stays), for you to finish
      cmpTips: [1, 2, 3, 4].map((n) => {
        // a cat you met: the tips are about meeting it (not "this is my cat")
        const met = c.kind === "met_cat", name = met ? "" : (c.catName || "").trim();
        const start = met ? tx("cpTip" + n + "Met") : name ? tx("cpTip" + n + "Pre", { name }) : tx("cpTip" + n + "PreAnon");
        return { label: tx("cpTip" + n), add: () => { const t = this.state.cmp?.text || ""; this.setCmp({ text: ((t.trim() ? t.replace(/\s*$/, "") + "\n" : "") + start).slice(0, 500), err: "" }); } };
      }),
      cmpNext: () => this.cmpNext(), cmpBack: () => this.cmpBack(), cmpClose: () => this.cmpClose(), cmpSend: () => this.cmpSend(),
      cmpEditLetter: () => this.setCmp({ step: 1, err: "" }), cmpEditCat: () => this.setCmp({ step: 2, editCat: true, err: "" }),
    };
    return {
      t, myName,
      sIntro: cur === "intro", sOnboard: cur === "onboard", sFeed: cur === "home", sShare: cur === "share", sCamera: cur === "camera",
      sInvite: cur === "invite",
      // after the story's Start: "start with a friend?" (my personal link) — and a friend's link to accept
      sPalStart: cur === "palStart", sPalAccept: cur === "palAccept",
      palPage: (() => {
        const p = st.palShare || {}, inv = st.palInv, d = inv?.d, cc = d?.country || "";
        const T = Object.fromEntries(["palTitle", "palDesc", "palInvite", "palSkip", "palMaking", "palSent", "palCopy", "palCopied", "palShare", "palStartGo",
          "palAcceptGo", "palLater", "palGoneTitle", "palGone", "palMine", "palAccepted", "palNotYetSub", "palFirst", "palStartGo2", "ivRetry", "palNoSignup"].map((k) => [k, tx(k)]));
        return {
          T,
          share: { phase: p.phase || "idle", url: p.url || "", sent: !!p.sent, copied: !!p.copied, err: p.err || "", canShare: kakaoConfigured || (typeof navigator !== "undefined" && !!(navigator as any).share),
            go: () => this.palInviteShare(), copy: () => this.palCopy(), skip: () => this.palStartDone(), done: () => this.palStartDone() },
          accept: inv ? {
            phase: inv.phase, busy: !!inv.busy, err: inv.err || "", ready: !!d?.ready,
            name: d?.nickname || "", flag: cc ? flagOf(cc) : "", country: cc ? cName(cc) : "", photo: d?.photo_path ? api.momentPhotoUrl(d.photo_path) : "",
            stamp: cc ? stampOf(cc) : STAMPS[0], pm: cc ? postmarkOf(cc) : "",
            who: d?.nickname ? tx("palWho", { name: d.nickname }) : tx("palWhoAnon"),
            acceptedText: d?.ready ? tx("palAccepted", { name: d.nickname || "" }) : tx("palAcceptedAnon"),
            go: () => this.palAccept(), later: () => this.palLater(), first: () => this.palFirstLetter(), retry: () => this.loadPalInvite(), home: () => this.palLater(),
          } : null,
        };
      })(),
      // a letter that came by link: the envelope, then the letter (the Mailbox's), and "Write back"
      ivPage: (() => {
        const inv = st.inv; if (!inv) return null;
        const d = inv.d, cc = d?.sender_country || "";
        const letter = d && d.status === "ok" ? {
          key: "inv-" + inv.token.slice(0, 8), name: d.sign || d.sender_nickname || "", flag: cc ? flagOf(cc) : "", country: cc ? cName(cc) : "", date: d.created_at ? day(d.created_at) : "",
          dateLong: d.created_at ? day(d.created_at) : "",
          photo: d.photo_path ? api.invitePhotoUrl(d.photo_path) : "", stamp: cc ? stampOf(cc) : STAMPS[0], pm: cc ? postmarkOf(cc) : "", isNew: true, body: d.body || "",
          writeBackLabel: d.mine ? tx("ivYours") : tx("mbWriteBack", { name: d.sender_nickname || "" }),
        } : null;
        return {
          phase: inv.phase, letter, mine: !!d?.mine, err: inv.err || "",
          from: cc ? tx("ivFrom", { flag: flagOf(cc), country: cName(cc) }) : "",
          gone: d && d.status !== "ok" ? tx("ivGone_" + d.status) : "",
          writeBack: d && d.status === "ok" && !d.mine ? () => this.inviteWriteBack() : null,
          retry: () => this.loadInvite(), leave: () => this.leaveInvite(),
          T: Object.fromEntries(["ivTitle", "ivNoSignup", "ivGoneTitle", "ivVisit", "ivRetry", "mbTap", "mbClose", "mbFromLabel", "cpDearName"].map((k) => [k, tx(k)])),
        };
      })(),
      sDeliveryMap: cur === "deliveryMap", sArrived: cur === "arrived", sLetters: cur === "letters", sMailbox: cur === "mailbox", sExplore: cur === "explore", sMap: cur === "map", sPassport: cur === "passport",
      showNav: ["home", "explore", "mailbox", "passport"].includes(cur) || (cur === "catmap" && !st.cmSel && !st.cmRoute && !st.cmList && !st.cmPlaceOpen), tabs,
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
        const rel = (iso) => when(iso);
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
      sCatMap: cur === "catmap", goCatMap: () => { this.go("catmap", { sheet: null, cmSel: null, cmRoute: null }); this.loadMap(); },
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
        // a letter's way shows on the Map once (one that came to you, not yet seen fly); after that the Map is as it always is
        const l = letters[letters.length - 1], th = l && threadById[l.thread_id];
        if (!me || !th || flown().includes(l.id)) return null;
        const o = otherOf(th), mine = l.sender_id === me.id, a = mine ? myCC : o.country, b2 = mine ? o.country : myCC;
        if (!COUNTRY_COORDS[a] || !COUNTRY_COORDS[b2]) return null;
        const d = distanceKm(a, b2);
        return { mine, key: l.id, play: true, doneText: tx(mine ? "cmSentDone" : "cmGotDone", { name: o.nickname }),
          label: tx(mine ? "cmLastSent" : "cmLastGot"), fromFlag: flagOf(a), from: cName(a), toFlag: flagOf(b2), to: cName(b2), who: o.nickname,
          km: d == null ? "" : fmt(d) + " km", when: when(l.created_at),
          a: { lon: COUNTRY_COORDS[a][0], lat: COUNTRY_COORDS[a][1] }, b: { lon: COUNTRY_COORDS[b2][0], lat: COUNTRY_COORDS[b2][1] } };
      })(),
      // my cat pals on the Map: pick one to see the way between you — both countries in view on the globe; in the same
      // country, the globe zooms into it and the country map takes over (country level: there are no cities yet)
      ...(() => {
        const at = (cc: string) => (COUNTRY_COORDS[cc] ? { lon: COUNTRY_COORDS[cc][0], lat: COUNTRY_COORDS[cc][1] } : null);
        const myL = me ? [...letters].reverse().find((l) => l.sender_id === me.id && l.photo_path) : null;
        const myPhoto = (myL && st.urls[myL.photo_path]) || photoOf(st.mine[0]) || "";
        // the way on with them, right there: "Reply to …" (their letter was the last) or "Write to …", on the usual paper
        // each cat pal: letters each way (and when the latest went / came), unread ones; where (no place: no marker)
        const letterN = (n: number, k: string) => tx(k, { n, w: tx(n === 1 ? "wLetter" : "wLetters") });
        // active lately: what you can see of them in the last 7 days — a letter to you, or a moment they shared (there is
        // no "last seen" kept, so nothing more is claimed)
        const week = Date.now() - 7 * 864e5, recent = (iso?: string) => !!iso && new Date(iso).getTime() > week;
        const lastMomentAt = (uid: string) => ((st.mapMoments as MomentCard[]).find((m) => m.user_id === uid) || (st.feed as MomentCard[]).find((m) => m.user_id === uid))?.created_at;
        const mk = (id: string, name: string, cc: string, photo: string, sent: string[], got: string[], unread: number, open: (() => void) | null, theirsLast: boolean, write: () => void, active = false) => {
          const n = sent.length + got.length, lastS = sent.sort().slice(-1)[0] || "", lastG = got.sort().slice(-1)[0] || "", last = lastS > lastG ? lastS : lastG;
          return {
            id, name, cc, flag: flagOf(cc), country: cName(cc), photo, n, ...(at(cc) || { lon: 0, lat: 0 }), placed: !!at(cc), unread,
            nText: letterN(n, "mbLetters"), sentN: sent.length, gotN: got.length,
            sentText: letterN(sent.length, "cmNSent"), gotText: letterN(got.length, "cmNGot"),
            sentWhen: lastS ? when(lastS) : "", gotWhen: lastG ? when(lastG) : "", when: last ? when(last) : "",
            sentAt: lastS, gotAt: lastG, lastAt: last, active: active || recent(lastG), open, km: myCC && cc && myCC !== cc ? km(myCC, cc) : "", replyLabel: tx(theirsLast ? "cmReplyTo" : "lWriteTo", { name }), write,
          };
        };
        const ago = (d: number) => new Date(Date.now() - d * 864e5).toISOString();
        const sample = (name: string, cc: string, photo: string, s2: number, r2: number, u: number) => mk("s-" + cc.toLowerCase(), name, cc, photo,
          Array.from({ length: s2 }, (_, i) => ago(2 + i * 3)), Array.from({ length: r2 }, (_, i) => ago(1 + i * 4 + (cc === "JP" ? 9 : 0))), u, null, true, () => this.sampleWriteBack({ name, cc, photo, body: "" }));
        const list = MAP_SAMPLE ? [
          sample("Léa", "FR", "./assets/cats/cat-2.jpg", 2, 2, 1), sample("Yuki", "JP", "./assets/cats/cat-3.jpg", 1, 2, 0), sample("Mochi", COUNTRY_COORDS[myCC] ? myCC : "KR", "./assets/cats/cat-6.jpg", 2, 1, 0),
        ] : pals.map((e) => {
          const t = latestThreadWith(e.p.id), ls = e.threads.flatMap((x) => byThread[x.id] || []), tl = t ? byThread[t.id] || [] : [], last = tl[tl.length - 1];
          const sent = ls.filter((l) => l.sender_id === me.id).map((l) => l.created_at), got = ls.filter((l) => l.sender_id !== me.id).map((l) => l.created_at);
          return mk(e.p.id, e.p.nickname, e.p.country, e.photo || latestMomentOf(e.p.id), sent, got, ls.filter((l) => l.sender_id !== me.id && !l.read_at).length,
            t ? () => this.openThread(t.id) : null, !!last && last.sender_id !== me.id,
            // "Write a letter": a new letter, with them already chosen as who it goes to (Send to, on its preview)
            () => { this.setState({ cmRoute: null, cmList: null }); if (t) { this.setState({ threadId: t.id, pendingMoment: null }); this.writeIn(); } else { this.openCompose(); this.setCmp({ to: e.p.id }); } }, recent(lastMomentAt(e.p.id)));
        });
        const homeCC = MAP_SAMPLE && !COUNTRY_COORDS[myCC] ? "KR" : myCC;
        const p = list.find((x) => x.id === st.cmRoute) || null;
        // picked from a list (Sent / Received / CatPals): its colour marks them, on the card and on the globe
        const tint = { sent: "#E5483D", received: "#3F7FD6", pals: "#A05245" }[st.cmFrom || "pals"];
        const route = p && homeCC ? {
          key: p.id, same: p.cc === homeCC, a: at(homeCC), b: at(p.cc), cc: p.cc, placed: !!(at(homeCC) && p.placed), tint, from: st.cmFrom || "pals",
          stat: st.cmFrom === "sent" ? p.sentText + (p.sentWhen ? " · " + p.sentWhen : "") : st.cmFrom === "received" ? p.gotText + (p.gotWhen ? " · " + p.gotWhen : "") : p.nText + (p.when ? " · " + p.when : ""),
          me: { name: MAP_SAMPLE ? "Tori" : myName, flag: flagOf(homeCC), country: cName(homeCC), photo: MAP_SAMPLE ? "./assets/cats/cat-1.jpg" : myPhoto, mine: true },
          them: p, km: p.cc !== homeCC ? km(homeCC, p.cc) : "",
        } : null;
        // the summary's three lists: who you've written to, who's written to you, and all your cat pals (one row each)
        const newest = (k: "sentAt" | "gotAt" | "lastAt") => (a: any, b: any) => (a[k] < b[k] ? 1 : -1);
        const lists = {
          sent: list.filter((x) => x.sentN).sort(newest("sentAt")).map((x) => ({ ...x, count: x.sentText, at: x.sentWhen })),
          received: list.filter((x) => x.gotN).sort(newest("gotAt")).map((x) => ({ ...x, count: x.gotText, at: x.gotWhen })),
          pals: [...list].sort(newest("lastAt")).map((x) => ({ ...x, count: x.nText, at: x.when })),
        };
        // the places on the Map: one marker for each place people are placed at (their country — nothing finer is made
        // up): your cat pals there, and the other cat lovers who shared a moment from there. Its photo is a cat pal's
        // (else one of theirs), its number how many people; tapped, the list of them (see CatMapScreen)
        const palIdSet = new Set(list.map((x) => x.id)), othersBy: Record<string, { ids: Set<string>; photo: string }> = {};
        const addOther = (uid: string, cc: string, photo: string) => {
          if (!uid || !cc || !at(cc) || (me && uid === me.id) || palIdSet.has(uid)) return;
          const o = othersBy[cc] || (othersBy[cc] = { ids: new Set(), photo }); o.ids.add(uid); if (!o.photo) o.photo = photo;
        };
        for (const m of st.mapMoments as MomentCard[]) addOther(m.user_id, m.country, photoOf(m));
        if (st.exState === "ready") for (const it of exAll) addOther(it.author_id, it.author_country, api.feedPhotoUrl(it));
        const placesBy: Record<string, any> = {};
        const placeOf = (cc: string) => placesBy[cc] || (placesBy[cc] = { cc, ...at(cc), pals: [] as any[], others: 0, otherPhoto: "" });
        for (const x of list) if (x.placed) placeOf(x.cc).pals.push(x);
        for (const cc in othersBy) { const g = placeOf(cc); g.others = othersBy[cc].ids.size; g.otherPhoto = othersBy[cc].photo; }
        const cmPlaces = Object.values(placesBy).map((g: any) => ({ id: "place-" + g.cc, cc: g.cc, lon: g.lon, lat: g.lat, count: g.pals.length + g.others,
          photo: (g.pals[0] && g.pals[0].photo) || g.otherPhoto || "", active: g.pals.some((x) => x.active), pals: g.pals, others: g.others,
          country: cName(g.cc), flag: flagOf(g.cc), othersText: g.others ? tx("cmPlaceOthers", { n: g.others, w: tx(g.others === 1 ? "wLover" : "wLovers") }) : "",
          momentsLabel: tx("cmPlaceMoments", { country: cName(g.cc) }) }));
        return {
          cmPals: list.filter((x) => x.placed), cmRoute: route, cmPalCount: MAP_SAMPLE ? list.length : pals.length, cmLang: L, cmPlaces,
          // you, on the close-up map (your country, for now)
          cmMe: homeCC && at(homeCC) ? { ...at(homeCC), photo: MAP_SAMPLE ? "./assets/cats/cat-1.jpg" : myPhoto, name: MAP_SAMPLE ? "Tori" : myName, place: cName(homeCC) } : null,
          cmList: st.cmList ? { id: st.cmList, title: tx({ sent: "mtSent", received: "mtRecv", pals: "cmPalsTab" }[st.cmList]), tint: { sent: "#E5483D", received: "#3F7FD6", pals: "#A05245" }[st.cmList], items: lists[st.cmList], empty: tx("cmListEmpty"), sel: st.cmRoute || null } : null,
          cmPlaceShown: (on: boolean) => { if (!!this.state.cmPlaceOpen !== on) this.setState({ cmPlaceOpen: on }); },
          cmOpenList: (id: string) => this.setState((p2) => ({ cmList: p2.cmList === id ? null : id, cmRoute: null, cmSel: null, cmFrom: id })), cmCloseList: () => this.setState({ cmList: null }),
          cmPick: (id: string, from?: string) => this.setState((p2) => ({ cmRoute: id, cmSel: null, cmList: null, cmFrom: from || p2.cmFrom || "pals" })), cmUnpick: () => this.setState({ cmRoute: null, cmList: null }),
          cmT: Object.fromEntries(["cmBackGlobe", "cmViewLetters", "cmYou", "cmSampleLetters", "cmWriteLetter", "cmNoPlace", "mtSent", "mtRecv", "cmPalsTab", "cmClose", "cmUnread", "cmPlacePals"].map((k) => [k, tx(k)])),
        };
      })(),
      cmGroups, cmHome: COUNTRY_COORDS[myCC] ? { lon: COUNTRY_COORDS[myCC][0], lat: COUNTRY_COORDS[myCC][1] } : null,
      cmSub: cmGroups.length ? tx("cmSub", { n: st.mapMoments.length, c: cmGroups.length, nw: tx(st.mapMoments.length === 1 ? "wMoment" : "wMoments"), cw: tx(cmGroups.length === 1 ? "wCountry" : "wCountries") }) : tx("cmEmpty"),
      cmSel: cmSelGroup && { ...cmSelGroup, cards: cmSelGroup.items.map((m) => ({ id: m.id, photo: photoOf(m), caption: m.caption, who: m.nickname, whoFlag: flagOf(m.author_country), mine: !!me && m.user_id === me.id, open: () => this.openMoment(m) })) },
      // the flight has landed: "Sent" on the card for a moment; each letter flies only once
      // (you stay on the Map: it's your tab; the move to the Mailbox belongs to sending, from the Arrived page)
      // flown: after its "Sent" / "Arrived" moment, the Map goes back to how it always is (no trace of it left)
      cmFlightDone: (f) => { if (f.key === "sample") return; markFlown(f.key); this.timers.push(setTimeout(() => this.setState({ cmTick: Date.now() }), 2400)); },
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
      // the thread's way to write: the usual letter paper (in reply to their latest letter, or to them)
      lWrite: lOther ? { label: tx("lWriteTo", { name: lOther.nickname }), sub: tx("lWriteSub"), go: () => this.writeIn() } : null,
      pickAlbum: () => { this.setState({ sheet: null }); this.albumRef.current && this.albumRef.current.click(); },
      pickCamera: () => this.setState({ sheet: null, camErr: false, screen: "camera", prev: cur }),
      onAlbum: (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; this.stopCam(); this.afterPhoto(f); },
      camErr: !!st.camErr,
      capture: () => this.snap(),

      // letters (thread)
      lPal: lOther ? { city: cName(lOther.country), flag: flagOf(lOther.country), dist: km(myCC, lOther.country) } : {},
      lMoment: lMoment ? { photo: photoOf(lMoment), caption: lMoment.caption, catName: lMoment.cat_name || "", mine: !!thr && !!me && thr.owner_id === me.id } : null,
      thread: lLetters.map((l) => {
        const you = !!me && l.sender_id === me.id, photo = l.photo_path ? st.urls[l.photo_path] || "" : "";
        return { key: l.id, text: l.body || "", photo, hasPhoto: !!l.photo_path, them: !you, you, who: ((you ? "FROM " + myName : "FROM " + (lOther ? lOther.nickname : "")) + " · " + day(l.created_at)).toUpperCase(), stamp: STAMPS[l.stamp] || STAMPS[0] };
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
      mbTabs: [tabDef("received", tx("received"), { badge: unreadThreads > 0 || MB_SAMPLE, count: unreadN }), tabDef("sent", tx("sent")), tabDef("pals", tx("catpals"))],
      mbShowCards: st.mbTab !== "pals", mbShowPals: st.mbTab === "pals",
      mbCards, palRows,
      mbEmpty: st.mailReady && (st.mbTab === "pals" ? !palRows.length : !mbCards.length),
      mbTab: st.mbTab, mbReady: !me || !!st.mailReady, mbReceived, mbSent, mbPals,
      // the letter being read (opened from the stack): it, whether it brought a new country's stamp, and on to the reply
      mbReading: (() => {
        const r = st.reading, l = r && me ? (letters as Letter[]).find((x) => x.id === r.id) : null;
        if (!l || !threadById[l.thread_id]) return null;
        const m = mailOf(l, false);
        return { ...m, firstStamp: !!r.firstStamp, newStampText: tx("mbNewStamp", { country: m.country }), writeBackLabel: tx("mbWriteBack", { name: m.name }),
          // "Write back": to your letters with them (as a Sent letter opens), where the reply is written from
          writeBack: () => { this.setState({ reading: null }); this.writeBack(l); }, close: () => this.setState({ reading: null }) };
      })(),
      mbT: Object.fromEntries(["mbEmptyRecvT", "mbEmptyRecvD", "mbEmptySentT", "mbEmptySentD", "mbEmptyPalsT", "mbEmptyPalsD", "mbSendCta", "mbNewTag", "mbSentMark", "mbFromLabel", "mbToLabel", "mbSampleNote", "mbCapRecv", "mbCapSent", "mbCapPals", "mbSwipe", "mbClose", "mbSentOn", "mbSampleReply", "mbOf", "mbWriteBackFor", "mbNewStampFor", "mbTap", "mbYourTurn", "mbSentTo", "mbPalsSum", "wPal", "wPals", "wCountry", "wCountries", "stDelivered", "stRead", "cpDearName", "mbSampleWrite"].map((k) => [k, tx(k)])),
      // ?mbSample=1: "Write back" on a sample letter opens the reply paper too (to try; it isn't sent)
      mbSampleWriteBack: (c) => this.sampleWriteBack(c),

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
      // to a cat pal you chose (or wrote back to): no spinning through countries — their cat's name and country, from the start
      dmKnown: st.dmKnown ? { name: st.dmKnown.name, place: flagOf(st.dmKnown.cc) + " " + cName(st.dmKnown.cc), from: (st.cmp?.kind === "met_cat" ? myName : (st.cmp?.catName || "").trim()) || myName } : null,
      mapDone: st.mapDone, destKm: destKm == null ? "" : fmt(destKm), destCity: dest ? cName(dest.cc) : "", arrFrom: cName(myCC),
      tapDeliveryCard: () => { if (this.state.mapDone) this.go("arrived"); },
      dmNoPal: cur === "deliveryMap" && !!st.noPal, dmNoPalT: { ...Object.fromEntries(["npTitle", "npDesc", "npInvite", "npSave"].map((k) => [k, tx(k)])),
        // already has cat pals: not "your first" — just no new one free right now
        ...(homePals.length ? { npTitle: tx("npTitleMore"), npDesc: tx("npDescMore") } : {}) },
      npInvite: () => this.cmpInvite(), npSave: () => this.saveForLater(),
      todayDate: day(new Date().toISOString()),
      isNewPal: st.isNewPal, destSlot: dest ? "pal-" + dest.uid : "", destImg: dest ? dest.photo : "", destStamp: STAMPS[st.stamp],
      openDestProfile: () => this.go("letters"),
      // the Arrived page: the letter just sent (your latest), where it went, and on to the Mailbox or home
      ...(() => {
        const l = me ? [...st.letters].reverse().find((x) => x.sender_id === me.id) : null;
        return {
          arrLetter: l ? { text: l.body || "", photo: l.photo_path ? st.urls[l.photo_path] || "" : "", sign: myName, flag: flagOf(myCC), country: cName(myCC) } : null,
          arrT: { ...Object.fromEntries(["cpDear", "cpPhotoSlot", "cpChangePhoto", "cpAddPhoto", "arrTitle", "arrCta", "arrHome", "dmFrom", "dmTo"].map((k) => [k, tx(k)])),
            // as it was written: to them by name once you know each other (not the thread's first letter)
            ...(l && dest && dest.name && st.letters.some((x) => x.thread_id === l.thread_id && x.id !== l.id) ? { cpDear: tx("cpDearName", { name: dest.name }) } : {}) },
          // delivered (this page comes only once the letter has really gone): where, and to whom
          arrTitleText: dest ? tx("arrTitleIn", { country: cName(dest.cc) }) : tx("arrTitle"), arrGiftOk: tx("arrGiftOk"),
          arrSub: dest ? tx("arrDelivered", { name: dest.name }) : "",
          // replies: notify me (on only when it really is), or on to the Mailbox
          arrNotify: { state: REPLY_NOTIFY_OFFERED ? st.notify : "hidden", label: tx("arrNotify"), view: tx("arrViewMailbox"), on: tx("arrNotifyOn"),
            note: !REPLY_NOTIFY_OFFERED ? "" : st.notify === "unavailable" ? tx("arrNotifyNA") : st.notify === "denied" ? tx("arrNotifyDenied") : st.notify === "failed" ? tx("arrNotifyFail") : "",
            go: async () => { const r = await enableReplyNotifications(); this.setState({ notify: r }); } },
          // a reply that went: the first to that country stamps its postmark in the passport (once); later ones just count
          arrReward: st.replyReward && dest && st.replyReward.cc === dest.cc ? {
            first: !!st.replyReward.first, pm: postmarkOf(dest.cc), flag: flagOf(dest.cc), country: cName(dest.cc),
            text: st.replyReward.first ? tx("arrNewMark") : tx("arrMoreMark", { country: cName(dest.cc) }), sub: st.replyReward.first ? tx("arrNewMarkSub", { country: cName(dest.cc) }) : "",
          } : null,
          arrFromFlag: flagOf(myCC), arrToFlag: dest ? flagOf(dest.cc) : "", arrToName: dest ? dest.name : "", arrFromName: myName,
          // the two cats: yours (the photo on this letter, else your latest moment) and theirs (their moment's photo)
          arrFromPhoto: (l && l.photo_path && st.urls[l.photo_path]) || photoOf(st.mine[0]) || "", arrToPhoto: dest ? dest.photo || "" : "",
          arrDate: day(new Date()),
          arrToMailbox: () => { this.go("mailbox", { sheet: null, mbTab: "sent" }); this.refreshMail(); },
          arrToHome: () => this.go("home", { sheet: null }),
        };
      })(),
      // the first exchange with a country, done (a reply that took its postmark): a postcard to share — your cat, the
      // two countries, how far, their stamp; never their name, cat or letter
      ...(() => {
        const sample = ARR_SAMPLE && cur === "arrived";
        const r = sample ? { cc: "FR", first: true } : st.replyReward, toCC = sample ? "FR" : dest?.cc || "", fromCC = sample ? "KR" : myCC;
        if (!r || !r.first || !toCC || (!sample && (!dest || r.cc !== dest.cc))) return { arrPostcard: null };
        const l = !sample && me ? [...st.letters].reverse().find((x) => x.sender_id === me.id) : null;
        const cat = sample ? "Mochi" : catInfo(me, st.mine).name || myName, d = distanceKm(fromCC, toCC);
        return {
          arrPostcard: {
            cta: tx("arrShareCta", { cat }), cat, say: tx("pcSay", { cat, country: cName(toCC) }), shareText: tx("pcShareText", { cat, country: cName(toCC) }),
            photo: sample ? "./assets/cats/cat-1.jpg" : (l && l.photo_path && st.urls[l.photo_path]) || photoOf(st.mine[0]) || "",
            from: flagOf(fromCC) + " " + cName(fromCC), to: flagOf(toCC) + " " + cName(toCC), km: d == null ? "" : fmt(d) + " km",
            date: day(new Date()), stamp: stampOf(toCC), pm: postmarkOf(toCC),
            title: tx("pcTitle", { cat }), T: Object.fromEntries(["pcNote", "pcShare", "pcSave", "pcClose", "pcMaking"].map((k) => [k, tx(k)])),
          },
        };
      })(),
      // ?arrSample=1: the page as it is after a first reply to France (no real letter needed)
      ...(ARR_SAMPLE && cur === "arrived" ? {
        sArrived: true, arrSample: tx("arrSampleNote"), destKm: fmt(distanceKm("KR", "FR") || 0), destCity: cName("FR"),
        arrTitleText: tx("arrTitleIn", { country: cName("FR") }), arrSub: tx("arrDelivered", { name: "Léa" }),
        arrFromFlag: flagOf("KR"), arrToFlag: flagOf("FR"), arrFromName: "Mochi", arrToName: "Léa", arrFromPhoto: "./assets/cats/cat-1.jpg", arrToPhoto: "./assets/cats/cat-2.jpg",
        arrLetter: { text: "Bonjour Léa! Mochi found the sunny spot again today — she says hi to Pom.", photo: "./assets/cats/cat-1.jpg", sign: "Mochi", flag: flagOf("KR"), country: cName("KR") },
        arrReward: { first: true, pm: postmarkOf("FR"), flag: flagOf("FR"), country: cName("FR"), text: tx("arrNewMark"), sub: tx("arrNewMarkSub", { country: cName("FR") }) },
      } : {}),
      myPm: postmarkOf(myCC), stampMotif: STAMPS[st.stamp],
      ...(ARR_SAMPLE && cur === "arrived" ? { myPm: postmarkOf("KR"), stampMotif: STAMPS[2], arrFrom: cName("KR") } : {}),

      // map
      globeMapSrc: "./globe.html?mode=map&from=" + globePoint(myCC || "KR")
        + "&sent=" + encodeURIComponent([...new Set(pals.filter((e) => e.iWrote).map((e) => globePoint(e.p.country)).filter(Boolean))].join(","))
        + "&recv=" + encodeURIComponent([...new Set(stampPals.map((e) => globePoint(e.p.country)).filter(Boolean))].join(",")),

      // passport
      openMe: () => this.go("passport", { ppTab: "mine" }),
      hasPhoto: !!myLatest, noPhoto: !myLatest, myPhoto: photoOf(myLatest),
      ...ppBook,
      ppT: Object.fromEntries(["ppTitle", "ppSub", "ppName", "ppIssued", "ppBook", "ppNotYet", "ppSampleNote", "cpYourCat", "ppStampWord", "ppMarkWord", "ppPalsHead", "ppEmblem", "ppTagline", "ppNoLabel", "ppFile", "ppStampsHead", "ppAsia", "ppEurope", "ppAmericas", "ppAfrica", "ppOceania", "ppEmptyPage"].map((k) => [k, tx(k)])),
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
      langOpts: LANGS.map(([id, label]) => ({ id, label })).map((o) => ({ ...o, bg: L === o.id ? "#F6F6F6" : "transparent", checkOpacity: L === o.id ? 1 : 0, pick: () => { saveLang(o.id); this.setState({ lang: o.id, langOpen: false }); } })),
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
            km: d == null ? "" : fmt(d) + " km", when: when(new Date(Date.now() - 2 * 86400000).toISOString()), a: at(hc), b: at(last[0]) },
          cmSel2: sel ? { cc: sel[0], flag: flagOf(sel[0]), name: cName(sel[0]), countText: tx("cmCount", { n: 1, nw: tx("wMoment") }),
            cards: [{ id: "sample-" + sel[0], photo: "./assets/cats/cat-" + sel[3] + ".jpg", caption: sel[2], who: sel[1], whoFlag: flagOf(sel[0]), mine: false }] } : null,
        };
      })() : {}),
    };
  }
}

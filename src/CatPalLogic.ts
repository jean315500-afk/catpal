// App state and behaviour, ported unchanged from the prototype's DCLogic class.
// renderVals() returns the flat object every screen component renders from.
import React from 'react';
import { DCLogic } from './dc/DCLogic';
import { I18N } from './i18n';

export default class CatPalLogic extends DCLogic {
  state: Record<string, any> = {
    screen: null, prev: "home", lang: null, langOpen: false, sheet: null, lockHint: false, to: null,
    myPhoto: null, profileDone: false, name: "Tori", age: "4", myTags: ["Sleepy", "Food Lover"], msg: "", stamp: 0, camErr: false,
    dest: null, phase: null, mapDone: false, sendCount: 0, sentToday: false, isNewPal: false,
    known: ["momo", "lumi", "bao", "frost"],
    inbox: [
      { id: "i0", pal: "momo", note: "Momo has three beds but still sleeps in a cardboard box 😭", date: "26-09-23", unread: true },
      { id: "i1", pal: "lumi", note: "Lumi supervised my cooking today. Zero stars, apparently.", date: "26-09-20", unread: false },
      { id: "i2", pal: "bao", note: "Knock, knock. 🐾", date: "26-09-14", unread: false },
      { id: "i3", pal: "frost", note: "Rainy London again — Frost refuses to go outside ☔", date: "26-09-09", unread: false },
    ],
    sent: [
      { pal: "lumi", date: "26-09-20", stamp: 2 }, { pal: "bao", date: "26-09-14", stamp: 3 },
      { pal: "momo", date: "26-09-10", stamp: 0 }, { pal: "frost", date: "26-09-08", stamp: 4 },
    ],
    threads: {}, tstate: { bao: "p0" }, mailId: null, profileId: "me", lettersId: "momo",
    draft: "", transit: null, mbTab: "received", ppTab: "stamps", reaction: null,
  };
  timers = [];
  I18N = I18N;
  componentDidMount() {
    this.onMsg = (e) => {
      const d = e.data; if (!d || d.type !== "catpal-city") return;
      const id = d.city === "Seoul" ? "me" : this.cityToPal && this.cityToPal[d.city];
      if (id) this.setState({ screen: "profile", profileId: id, prev: "map", sheet: null, langOpen: false });
    };
    window.addEventListener("message", this.onMsg);
    this.syncCam(); }
  componentDidUpdate() {
    // Arrived screen moves on to Mailbox › Sent by itself after 3s (unless the user already left it).
    const was = this.lastScreen; this.lastScreen = this.state.screen;
    if (this.state.screen === "arrived" && was !== "arrived") {
      clearTimeout(this.arrT);
      this.arrT = setTimeout(() => { if (this.state.screen === "arrived") this.go("mailbox", { sheet: null, mbTab: "sent" }); }, 3000);
    }
    this.syncCam(); const el = this.threadRef && this.threadRef.current; if (el) el.scrollTop = el.scrollHeight; }
  componentWillUnmount() { window.removeEventListener("message", this.onMsg); this.stopCam(); clearTimeout(this.arrT); this.timers.forEach(clearTimeout); }
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
  afterPhoto(url) {
    // data: URLs contain ";" which breaks the inline background:url() style, so use a blob: URL instead.
    if (url && url.startsWith("data:")) {
      const [head, b64] = url.split(","); const bin = atob(b64); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      url = URL.createObjectURL(new Blob([bytes], { type: head.slice(5).split(";")[0] }));
    }
    this.setState((p) => ({ myPhoto: url || p.myPhoto, sheet: null, screen: p.profileDone ? "message" : "info" })); }
  snap() {
    const v = this.videoRef && this.videoRef.current;
    if (this.stream && v && v.videoWidth) {
      const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext("2d").drawImage(v, 0, 0); this.stopCam(); this.afterPhoto(c.toDataURL("image/jpeg", .85));
    } else this.afterPhoto(null);
  }
  go(screen, extra?) { this.setState((p) => ({ screen, prev: this.cur, langOpen: false, ...(extra || {}) })); }

  renderVals() {
    const st = this.state;
    const LANGS = [["en", "English", "en-US"], ["ko", "한국어", "ko-KR"], ["ja", "日本語", "ja-JP"], ["zh", "中文", "zh-CN"], ["es", "Español", "es-ES"], ["fr", "Français", "fr-FR"], ["de", "Deutsch", "de-DE"], ["pt", "Português", "pt-BR"], ["th", "ไทย", "th-TH"], ["id", "Bahasa Indonesia", "id-ID"]];
    const propLang = (LANGS.find((x) => x[1] === this.props.language) || LANGS[0])[0];
    const L = st.lang ?? propLang;
    const LOC = (LANGS.find((x) => x[0] === L) || LANGS[0])[2];
    const D = this.I18N[L] || this.I18N.en, DE = this.I18N.en;
    const tx = (k, v?) => { let s = D[k] ?? DE[k] ?? k; if (v) for (const n in v) s = s.split("{" + n + "}").join(String(v[n])); return s; };
    const SINCE = { momo: [5, 9], lumi: [7, 21], bao: [8, 31], frost: [9, 16] };
    const sinceOf = (id) => SINCE[id] ? new Intl.DateTimeFormat(LOC, { month: "short", day: "numeric" }).format(new Date(2026, SINCE[id][0] - 1, SINCE[id][1])) : tx("today");
    const CI = { Japan: 0, Italy: 1, Taiwan: 2, UK: 3, Indonesia: 4, France: 5, Thailand: 6, Australia: 7, USA: 8, Canada: 9, Singapore: 10 };
    const cName = (p) => D.C[CI[p.country[0]]];
    const startMap = { Intro: "intro", Home: "home", Mailbox: "mailbox", "World Map": "map", Passport: "passport", "Cat Profile": "profile" };
    const cur = st.screen ?? startMap[this.props.startScreen] ?? "intro";
    this.cur = cur;
    const lockOn = this.props.sendToUnlock ?? true;
    const fmt = (n) => n.toLocaleString("en-US");
    const STAMPS = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => "./assets/stamp-" + i + ".png");
    const PALS = {
      momo: { name: "Momo", age: 3, city: "Tokyo", country: ["Japan"], flag: "🇯🇵", km: 1158, tz: "Asia/Tokyo", stamp: 1, pm: "tokyo", tags: ["Sleepy", "Food Lover"], letters: 42 },
      lumi: { name: "Lumi", age: 5, city: "Rome", country: ["Italy"], flag: "🇮🇹", km: 8950, tz: "Europe/Rome", stamp: 2, pm: "roma", tags: ["Mischievous", "Curious"], letters: 18 },
      bao: { name: "Bao", age: 4, city: "Taipei", country: ["Taiwan"], flag: "🇹🇼", km: 1480, tz: "Asia/Taipei", stamp: 3, pm: "taipei", tags: ["Food Lover", "Chatty"], letters: 9 },
      frost: { name: "Frost", age: 6, city: "London", country: ["UK"], flag: "🇬🇧", km: 8860, tz: "Europe/London", stamp: 4, pm: "london", tags: ["Shy", "Sleepy"], letters: 3 },
      kopi: { name: "Kopi", age: 2, city: "Bali", country: ["Indonesia"], flag: "🇮🇩", km: 5250, tz: "Asia/Makassar", stamp: 5, pm: "bali", tags: ["Explorer", "Cuddly"], letters: 1 },
      miko: { name: "Miko", age: 1, city: "Paris", country: ["France"], flag: "🇫🇷", km: 8960, tz: "Europe/Paris", stamp: 6, pm: "paris", tags: ["Mischievous", "Shy"], letters: 1 },
      mango: { name: "Mango", age: 3, city: "Bangkok", country: ["Thailand"], flag: "🇹🇭", km: 3720, tz: "Asia/Bangkok", stamp: 7, pm: "bangkok", tags: ["Food Lover", "Cuddly"], letters: 1 },
      pudding: { name: "Pudding", age: 2, city: "Sydney", country: ["Australia"], flag: "🇦🇺", km: 8320, tz: "Australia/Sydney", stamp: 1, pm: "sydney", tags: ["Sleepy", "Chatty"], letters: 1 },
      bagel: { name: "Bagel", age: 4, city: "New York", country: ["USA"], flag: "🇺🇸", km: 11050, tz: "America/New_York", stamp: 2, pm: "newyork", tags: ["Curious", "Explorer"], letters: 1 },
      maple: { name: "Maple", age: 5, city: "Vancouver", country: ["Canada"], flag: "🇨🇦", km: 8190, tz: "America/Vancouver", stamp: 3, pm: "vancouver", tags: ["Shy", "Explorer"], letters: 1 },
      kaya: { name: "Kaya", age: 2, city: "Singapore", country: ["Singapore"], flag: "🇸🇬", km: 4630, tz: "Asia/Singapore", stamp: 4, pm: "singapore", tags: ["Mischievous", "Chatty"], letters: 1 },
    };
    this.cityToPal = Object.fromEntries(Object.keys(PALS).filter((k) => this.state.known.includes(k)).map((k) => [PALS[k].city, k]));
    const NOTES = { kopi: "Hi from Bali! Kopi found the warmest tile in the house ☀️", miko: "Bonjour! Miko discovered the mirror cat again. Round 3 🪞", mango: "Sawasdee! Mango stole a mango. Of course. 🥭", pudding: "G’day! Pudding is sunbathing upside down ☀️", bagel: "Hey from NYC! Bagel watches the pigeons all day 🐦", maple: "Hi from Vancouver! Maple loves the first rain of fall 🍁", kaya: "Hello from Singapore! Kaya napped through a thunderstorm ⛈️" };
    const TAGS = { Sleepy: "잠꾸러기", Shy: "수줍음", Mischievous: "장난꾸러기", "Food Lover": "먹보", Curious: "호기심", Cuddly: "애교쟁이", Chatty: "수다쟁이", Explorer: "탐험가" };
    const tagLabel = (k) => D.tags[Object.keys(TAGS).indexOf(k)] || k;
    const myName = st.name || "Tori";
    const palSlot = (id) => "pal-" + id;
    // Default photo for each pal's image slot (a dropped image still overrides it).
    const palImg = (id) => "./assets/cats/cat-" + (Object.keys(PALS).indexOf(id) % 6 + 1) + ".jpg";
    const dist = (p) => fmt(p.km) + " km";
    const pmOf = (p) => "./assets/pm/" + p.pm + ".png";
    const pPlace = (p) => p.city + ", " + cName(p) + " " + p.flag;
    const known = st.known;
    const lastSentTo = st.sentToday ? st.sent[0] : null;

    const unread = st.inbox.filter((m) => m.unread);
    const isLocked = (m) => lockOn && m.unread && !st.sentToday;
    const openMail = (m) => () => {
      if (isLocked(m)) { this.setState({ sheet: "to", lockHint: true, langOpen: false }); return; }
      this.setState((p) => ({ inbox: p.inbox.map((x) => (x.id === m.id ? { ...x, unread: false } : x)), mailId: m.id, screen: "mail", prev: cur, reaction: null, reactN: 0, langOpen: false }));
    };
    const openProfile = (id) => () => this.go("profile", { profileId: id, sheet: null });
    const seedThread = (id) => {
      const firstMail = [...st.inbox].reverse().find((m) => m.pal === id);
      return [{ from: "pal", text: firstMail ? firstMail.note : (NOTES[id] || "Hello! 💛") }];
    };
    const openLetters = (id) => () => this.go("letters", { lettersId: id, sheet: null, draft: "", draftPhoto: null, transit: null });
    const startSend = (id) => this.setState({ to: id, sheet: null, lockHint: false, screen: "upload", prev: cur, msg: "", langOpen: false });

    const palRows = known.map((id) => {
      const p = PALS[id];
      const lettersN = (st.threads[id] ? st.threads[id].length : 0) + p.letters;
      return {
        id, slot: palSlot(id), img: palImg(id), name: p.name, flag: p.flag, city: p.city, dist: dist(p),
        meta: tx("palMeta", { n: lettersN, since: sinceOf(id) }),
        open: openProfile(id), letters: (e) => { e && e.stopPropagation && e.stopPropagation(); openLetters(id)(); }, choose: () => startSend(id),
      };
    });

    const palReply = (id, text, free) => {
      const name = PALS[id].name, t = text.trim(), clean = t.replace(/[.!?…]+$/, "").slice(0, 32);
      if (free === "p0" && /who/i.test(t)) return { reply: "Tuna.", free: "p1" };
      if (free === "p1" && /who/i.test(t)) return { reply: "Tuna in tomorrow for another cat pic! 🐟😹", free: null };
      if (free === "k1") return { reply: clean + " who?", free: "k2" };
      if (free === "k2") return { reply: "😂😂 OK that got me. " + name + " is rolling on the floor!", free: null };
      if (free === "d1") return { reply: "🙄😂 That’s terrible. I love it. Send another!", free: null };
      if (/knock/i.test(t)) return { reply: "Who’s there?", free: "k1" };
      if (/\?$/.test(t)) return { reply: "Hmm… I don’t know. What? 🤔", free: "d1" };
      const g = ["Haha 😂 " + name + " says meow back! Got a joke for me?", "😹 Your turn — tell me a knock-knock!", "Hehe. Tomorrow’s cat pic better be this funny 🐾"];
      return { reply: g[(t.length + name.length) % g.length], free: null };
    };

    const target = st.to ? PALS[st.to] : null;
    const dest = st.dest ? PALS[st.dest] : PALS.lumi;
    const mail = st.inbox.find((m) => m.id === st.mailId) || st.inbox[0];
    const mPal = PALS[mail.pal];
    const lp = PALS[st.lettersId] || PALS.momo;
    const thread = st.threads[st.lettersId] || seedThread(st.lettersId);
    const pid = st.profileId;
    const isMe = pid === "me";
    const pp = isMe ? null : PALS[pid];

    const sendNow = () => {
      const s = this.state;
      let id = s.to;
      if (!id) {
        const forced = Object.keys(PALS).find((k) => PALS[k].city === this.props.surpriseCity);
        const fresh = ["kopi", "miko", "mango", "pudding", "bagel", "maple", "kaya"].filter((k) => !s.known.includes(k));
        id = forced || (fresh.length ? fresh[Math.floor(Math.random() * fresh.length)] : s.known[Math.floor(Math.random() * s.known.length)]);
      }
      const isNew = !s.known.includes(id);
      this.setState({ dest: id, to: id, isNewPal: isNew, screen: "deliveryMap", phase: null, mapDone: false, sendCount: s.sendCount + 1, langOpen: false });
      this.timers.push(
        setTimeout(() => { if (this.state.screen === "deliveryMap") this.setState({ screen: "arrived", prev: "deliveryMap" }); }, 7600),
        setTimeout(() => {
          const p = this.state, m = p.msg.trim();
          const base = p.threads[id] || seedThread(id);
          const r = m ? palReply(id, m, p.tstate[id]) : null;
          this.setState({
            mapDone: true, sentToday: true,
            known: p.known.includes(id) ? p.known : [...p.known, id],
            sent: [{ pal: id, date: "26-09-23", stamp: p.stamp }, ...p.sent],
            threads: m ? { ...p.threads, [id]: [...base, { from: "me", text: m, stamp: p.stamp }] } : p.threads,
            tstate: r ? { ...p.tstate, [id]: r.free } : p.tstate,
          });
          this.timers.push(setTimeout(() => {
            const q = this.state;
            const note = r ? r.reply : (NOTES[id] && !q.inbox.some((x) => x.pal === id) ? NOTES[id] : "Here’s what " + PALS[id].name + " is up to today 🐾");
            this.setState({
              inbox: [{ id: "r" + Date.now(), pal: id, note, date: "26-09-23", unread: true }, ...q.inbox],
              threads: r ? { ...q.threads, [id]: [...(q.threads[id] || []), { from: "pal", text: r.reply }] } : q.threads,
            });
          }, 3500));
        }, 7000),
      );
    };

    const sendLetter = () => {
      const s = this.state, text = s.draft.trim(), id = s.lettersId, photo = s.draftPhoto || null;
      if ((!text && !photo) || s.transit) return;
      const base = s.threads[id] || seedThread(id);
      const r = palReply(id, text || "📷", s.tstate[id]);
      this.setState({ threads: { ...s.threads, [id]: [...base, { from: "me", text, photo, stamp: s.stamp }] }, draft: "", draftPhoto: null, transit: "sending" });
      this.timers.push(
        setTimeout(() => this.setState({ transit: "writing" }), 1100),
        setTimeout(() => this.setState((p) => ({ transit: null, tstate: { ...p.tstate, [id]: r.free }, threads: { ...p.threads, [id]: [...(p.threads[id] || []), { from: "pal", text: r.reply }] } })), 2300),
      );
    };

    const backMap = { upload: "home", camera: "upload", info: "upload", message: "upload", stamp: "message", send: "stamp", mail: st.prev && st.prev !== "mail" ? st.prev : "home", letters: st.prev && st.prev !== "letters" ? st.prev : "mailbox", profile: st.prev && st.prev !== "profile" ? st.prev : "home" };
    const navActive = { home: "home", mailbox: "mailbox", map: "map", passport: "passport" }[cur];
    const unreadOpen = unread.filter((m) => !isLocked(m)).length;
    const navItems = [
      { id: "home", label: tx("navHome"), icon: st.hmAnim ? (st.hmAnim % 2 ? "./assets/home.gif" : "./assets/home-b.gif") : "./assets/icon-home.png", iconH: st.hmAnim ? 62 : 44, iconMt: st.hmAnim ? -18 : 0 },
      { id: "mailbox", label: tx("navMailbox"), icon: st.mbAnim ? (st.mbAnim % 2 ? "./assets/mailbox.gif" : "./assets/mailbox-b.gif") : "./assets/mailbox-still.png", count: unread.length },
      { id: "map", label: tx("navMap"), icon: st.mpAnim ? (st.mpAnim % 2 ? "./assets/map.gif" : "./assets/map-b.gif") : "./assets/icon-map-160.png", iconH: st.mpAnim ? 54 : 44, iconMt: st.mpAnim ? -10 : 0 },
      { id: "passport", label: tx("navPassport"), icon: st.ppAnim ? (st.ppAnim % 2 ? "./assets/passport.gif" : "./assets/passport-b.gif") : "./assets/passport-still.png", iconW: 56, iconH: 50, iconMt: -6 },
    ].map((n) => ({ iconW: 44, iconH: 44, iconMt: 0, ...n, tap: () => {
        if (n.id === "home") { const t = Date.now(); clearTimeout(this.hmT); this.hmT = setTimeout(() => this.setState({ hmAnim: null }), 3000); this.go(n.id, { sheet: null, hmAnim: t }); }
        else if (n.id === "map") { const t = Date.now(); clearTimeout(this.mpT); this.mpT = setTimeout(() => this.setState({ mpAnim: null }), 3000); this.go(n.id, { sheet: null, mpAnim: t }); }
        else if (n.id === "passport") { const t = Date.now(); clearTimeout(this.ppT); this.ppT = setTimeout(() => this.setState({ ppAnim: null }), 3000); this.go(n.id, { sheet: null, ppAnim: t }); }
        else if (n.id === "mailbox") { const t = Date.now(); clearTimeout(this.mbT); this.mbT = setTimeout(() => this.setState({ mbAnim: null }), 3000); this.go(n.id, { sheet: null, mbAnim: t, mbTab: "received" }); }
        else this.go(n.id, { sheet: null });
      }, weight: navActive === n.id ? 700 : 500, color: navActive === n.id ? "#010002" : "#a89f8d", opacity: navActive === n.id || !navActive ? 1 : .55, badge: !!n.count }));

    const countries = new Set(known.map((k) => PALS[k].country[0])).size;
    const totalKm = st.sent.reduce((a, s) => a + PALS[s.pal].km, 0);
    const stampBook = [
      { img: "./assets/pm/seoul.png", label: myName, sub: "Seoul 🇰🇷", owned: true, open: openProfile("me") },
      ...Object.keys(PALS).map((id) => ({ img: pmOf(PALS[id]), label: known.includes(id) ? PALS[id].name : "???", sub: known.includes(id) ? PALS[id].city + " " + PALS[id].flag : tx("yetToMeet"), owned: known.includes(id), open: known.includes(id) ? openProfile(id) : () => this.setState({ sheet: "to", lockHint: false }) })),
          ].map((s, i) => ({ ...s, locked: !s.owned, opacity: s.owned ? .9 : .13, filter: s.owned ? "none" : "grayscale(1)", rot: [-9, 6, -4, 11, -7, 3, -12, 8, -5, 10, -2, 7][i % 12], dy: [0, 8, -4, 6, -6, 4, 2, -8, 6, -2, 8, -4][i % 12] }));

    const calCells = [];
    for (let i = 0; i < 2; i++) calCells.push({ n: "", sent: false, recv: false, weight: 500, color: "#746e63" });
    const sentDays = new Set(st.sent.map((s) => Number(s.date.slice(6))));
    const recvDays = new Set(st.inbox.filter((m) => !m.unread).map((m) => Number(m.date.slice(6))));
    for (let d = 1; d <= 30; d++) calCells.push({ n: String(d), sent: sentDays.has(d), recv: recvDays.has(d), weight: d === 23 ? 800 : 500, color: d === 23 ? "#FF4800" : "#746e63" });
    while (calCells.length < 35) calCells.push({ n: "", sent: false, recv: false, weight: 500, color: "#746e63" });

    const mbCards = st.mbTab === "sent"
      ? st.sent.map((s) => { const p = PALS[s.pal]; return { who: tx("toPrefix", { name: p.name }), place: p.flag + " " + p.city + " · " + dist(p), date: s.date, stamp: STAMPS[s.stamp], pm: "./assets/pm/seoul.png", isNew: false, locked: false, open: openLetters(s.pal) }; })
      : st.inbox.map((m) => { const p = PALS[m.pal]; return { who: tx("fromPrefix", { name: p.name }), place: p.flag + " " + p.city, date: m.date, stamp: STAMPS[p.stamp], pm: pmOf(p), isNew: m.unread && !isLocked(m), locked: isLocked(m), open: openMail(m) }; });
    const tabDef = (id, label, extra?) => ({ label, bg: st.mbTab === id ? "#fff" : "transparent", color: st.mbTab === id ? "#010002" : "#a89f8d", shadow: st.mbTab === id ? "0 1px 3px rgba(0,0,0,.1)" : "none", tap: () => this.setState({ mbTab: id }), badge: false, count: 0, ...(extra || {}) });

    const ph = st.phase;
    const reallyNew = st.isNewPal;
    const t = {
      ...Object.fromEntries(["introTitle","introSub","start","reply","sendMail","homeQ","sendCatMail","newMail","locked","noMail","whoTo","lockHint","surprise","surpriseSub","yourPals","upload","sheetTitle","album","camera","cancel","camErr","infoHint","name","age","personality","tapToEdit","msgPh","guideTitle","useKnock","guideNote","starters","pickStamp","send","mapTitle","tapContinue","stampCollected","backHome","replyPhoto","letters","photoShort","sendBack","mailbox","legendSent","legendMet","passportSub"].map((k) => [k, tx(k)])),
      newTag: "NEW",
      homeDate: new Intl.DateTimeFormat(LOC, { weekday: "short", month: "short", day: "numeric" }).format(new Date(2026, 8, 23)) + " · Seoul 🇰🇷",
      heroTo: lastSentTo ? tx("heroToSent", { name: PALS[lastSentTo.pal].name }) : tx("heroToNone"),
      heroStatus: lastSentTo ? tx("heroStatusSent", { city: PALS[lastSentTo.pal].city + " " + PALS[lastSentTo.pal].flag }) : "",
      toName: target ? target.name + " · " + target.city + " " + target.flag : tx("somewhere"),
      toShort: target ? target.name : tx("somewhereShort"),
      toLine: target ? tx("toLinePal", { name: target.name, city: target.city + " " + target.flag }) : tx("toLineNone"),
      fromLine: tx("fromLine") + myName + ", " + (st.age || "4"),
      finding: ph === "spin" ? tx("finding") : tx("flyingTo", { name: dest.name }),
      deliveryCard: st.mapDone ? tx("deliveryDone", { city: dest.city }) : tx("deliveryGoing", { city: dest.city }),
      arr1: tx("arr1", { name: myName, country: cName(dest) }) + " " + dest.flag,
      newPalTitle: tx("newPal", { name: dest.name, city: dest.city }),
      mailTitle: tx("mailTitle", { name: mPal.name }),
      lettersWith: tx("lettersWith", { name: lp.name }),
      letterCount: tx("letterCount", { n: thread.length }),
      transit: st.transit === "sending" ? tx("transitSending", { city: lp.city }) : tx("transitWriting", { name: lp.name }),
      toUpper: "TO " + lp.name.toUpperCase(),
      draftHint: tx("draftHint", { name: lp.name }),
      composeNote: st.transit ? tx("composeWait") : tx("composeKeep"),
      mapSub: tx("mapSub", { name: myName }),
      mapStats: tx("mapStats", { c: countries, n: known.length, km: fmt(totalKm) }),
      passportTitle: tx("passportTitle", { name: myName }),
      month: new Intl.DateTimeFormat(LOC, { year: "numeric", month: "long" }).format(new Date(2026, 8, 1)).toLocaleUpperCase(LOC),
      pfSend: pp ? tx("pfSend", { name: pp.name }) : "",
      pfStampNote: pp ? tx("pfStampNote", { name: pp.name }) : "",
    };

    return {
      t, myName,
      showLogo: cur !== "camera",
      sIntro: cur === "intro", sHome: cur === "home", sUpload: cur === "upload", sCamera: cur === "camera", sInfo: cur === "info",
      sMessage: cur === "message", sStamp: cur === "stamp", sSend: cur === "send", sDelivery: cur === "delivery", sDeliveryMap: cur === "deliveryMap",
      sArrived: cur === "arrived", sMail: cur === "mail", sLetters: cur === "letters", sMailbox: cur === "mailbox", sMap: cur === "map",
      sPassport: cur === "passport", sProfile: cur === "profile",
      showNav: ["home", "mailbox", "map", "passport", "profile"].includes(cur),
      showBack: ["upload", "info", "message", "stamp", "send", "mail", "letters", "profile"].includes(cur),
      back: () => { this.stopCam(); this.go(backMap[cur] || "home"); },
      navItems,
      goHome: () => this.go("home", { sheet: null }),
      openMe: openProfile("me"),
      hasPhoto: !!st.myPhoto, noPhoto: !st.myPhoto, myPhoto: st.myPhoto || "",
      heroStamp: STAMPS[lastSentTo ? lastSentTo.stamp : 0],
      heroStatusColor: lastSentTo ? "#010002" : "#a89f8d",
      openSendSheet: () => this.setState({ sheet: "to", lockHint: false, langOpen: false }),
      newMailCards: unread.map((m) => { const p = PALS[m.pal]; return { pm: pmOf(p), title: tx("mailFrom", { name: p.name }), flag: p.flag, city: p.city, stamp: STAMPS[p.stamp], locked: isLocked(m), open: openMail(m) }; }),
      hasNewMail: unread.length > 0, noNewMail: unread.length === 0, newMailCount: unread.length,
      sheetTo: st.sheet === "to", sheetPhoto: st.sheet === "photo", lockHint: st.lockHint,
      closeSheet: () => this.setState({ sheet: null, lockHint: false }),
      chooseSurprise: () => startSend(null),
      palRows,
      openPhotoSheet: () => this.setState({ sheet: "photo" }),
      videoRef: this.videoRef || (this.videoRef = React.createRef()),
      albumRef: this.albumRef || (this.albumRef = React.createRef()),
      threadRef: this.threadRef || (this.threadRef = React.createRef()),
      pickAlbum: () => { this.setState({ sheet: null }); this.albumRef.current && this.albumRef.current.click(); },
      pickCamera: () => this.setState({ sheet: null, camErr: false, screen: "camera", prev: cur }),
      onAlbum: (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; this.stopCam(); const r = new FileReader(); r.onload = () => this.afterPhoto(r.result); r.readAsDataURL(f); },
      camErr: !!st.camErr,
      capture: () => this.snap(),
      nameVal: st.name, ageVal: st.age,
      setName: (e) => this.setState({ name: e.target.value }), setAge: (e) => this.setState({ age: e.target.value }),
      myTagChips: Object.keys(TAGS).map((k) => { const on = st.myTags.includes(k); return { label: tagLabel(k), bg: on ? "#464646" : "#F6F6F6", color: on ? "#fff" : "#000", tap: () => this.setState((p) => ({ myTags: on ? p.myTags.filter((x) => x !== k) : [...p.myTags, k] })) }; }),
      infoNext: () => this.go("message", { profileDone: true }),
      msgVal: st.msg, setMsg: (e) => this.setState({ msg: e.target.value.slice(0, 120) }), msgCount: st.msg.length,
      useKnock: () => this.setState({ msg: "Knock, knock." }),
      guideLines: [["you", "Knock, knock."], ["pal", "Who’s there?"], ["you", "Lettuce."], ["pal", "Lettuce who?"], ["you", "Lettuce in, it’s cold out here! 🥶"]].map(([w, x]) => ({ you: w === "you", pal: w === "pal", text: x })),
      msgNext: () => this.go("stamp"),
      stampsGo: STAMPS.map((m, i) => ({ m, border: i === st.stamp ? "2px solid #010002" : "2px solid transparent", pick: () => this.go("send", { stamp: i }) })),
      stamps: STAMPS.map((m, i) => ({ m, border: i === st.stamp ? "2px solid #010002" : "2px solid transparent", pick: () => this.setState({ stamp: i }) })),
      stampMotif: STAMPS[st.stamp],
      sendNow,
      phFly: ph === "fly", phPin: ph === "pin",
      globeDur: ph === "pin" ? "3.8s" : "1.4s",
      globeDeliverySrc: "./globe.html?mode=delivery&to=" + encodeURIComponent(dest.city) + "&k=" + st.sendCount,
      mapDone: st.mapDone, destKm: fmt(dest.km), destCity: dest.city,
      tapDeliveryCard: () => { if (this.state.mapDone) this.go("arrived"); },
      todayDate: "26-09-23",
      isNewPal: reallyNew, destSlot: palSlot(st.dest || "lumi"), destImg: palImg(st.dest || "lumi"), destStamp: STAMPS[dest.stamp],
      openDestProfile: openProfile(st.dest || "lumi"),
      myPm: "./assets/pm/seoul.png", mPm: pmOf(mPal),
      mSlot: palSlot(mail.pal), mImg: palImg(mail.pal), mStamp: STAMPS[mPal.stamp], mPlace: pPlace(mPal), mDist: tx("away", { d: dist(mPal) }), mNote: mail.note,
      openMailProfile: openProfile(mail.pal),
      reactions: ["💛", "😹", "🐾", "😴", "🎉"].map((e, i) => ({ e, bg: st.reaction === i ? "#fff" : "transparent",
        anim: st.reaction === i && st.reactN ? "cp-rpop" + (st.reactN % 2 ? "a" : "b") + " .45s cubic-bezier(.34,1.56,.64,1)" : "none",
        pick: () => { try { navigator.vibrate && navigator.vibrate(15); } catch (_) {} this.setState((p) => ({ reaction: i, reactN: (p.reactN || 0) + 1 })); } })),
      // Burst of the picked emoji; centres match the 5 buttons spaced around the 265px bar at left:68px.
      reactBurst: st.reaction != null && st.reactN ? Array.from({ length: 7 }, (_, j) => ({ e: ["💛", "😹", "🐾", "😴", "🎉"][st.reaction], left: 90 + 49 * st.reaction,
        anim: "cp-b" + j + (st.reactN % 2 ? "a" : "b") + " 1.4s cubic-bezier(.2,.7,.3,1) " + j * 45 + "ms both" })) : [],
      mWiggle: st.reactN ? "cp-wig" + (st.reactN % 2 ? "a" : "b") + " .7s ease .35s" : "none",
      openMailLetters: openLetters(mail.pal),
      lPal: { city: lp.city, flag: lp.flag, dist: dist(lp) },
      thread: thread.map((l) => ({ text: l.text, photo: l.photo || "", hasPhoto: !!l.photo, them: l.from === "pal", you: l.from === "me", who: (l.from === "pal" ? "FROM " + lp.name : "FROM " + myName).toUpperCase(), stamp: l.from === "pal" ? STAMPS[lp.stamp] : STAMPS[l.stamp ?? 0] })),
      draft: st.draft, setDraft: (e) => this.setState({ draft: e.target.value }),
      inTransit: !!st.transit,
      sendBg: (st.draft.trim() || st.draftPhoto) && !st.transit ? "#010002" : "#B9B2A4",
      draftPhoto: st.draftPhoto || "", hasDraftPhoto: !!st.draftPhoto, noDraftPhoto: !st.draftPhoto,
      replyPhotoRef: this.replyPhotoRef || (this.replyPhotoRef = React.createRef()),
      pickReplyPhoto: () => { this.replyPhotoRef.current && this.replyPhotoRef.current.click(); },
      onReplyPhoto: (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) this.setState({ draftPhoto: URL.createObjectURL(f) }); },
      clearReplyPhoto: () => this.setState({ draftPhoto: null }),
      sendLetter,
      mbTabs: [tabDef("received", tx("received"), { badge: unreadOpen > 0, count: unreadOpen }), tabDef("sent", tx("sent")), tabDef("pals", tx("catpals"))],
      mbShowCards: st.mbTab !== "pals", mbShowPals: st.mbTab === "pals",
      mbCards,
      globeMapSrc: "./globe.html?mode=map&sent=" + encodeURIComponent([...new Set(st.sent.map((s) => PALS[s.pal].city))].join(",")) + "&recv=" + encodeURIComponent(known.map((k) => PALS[k].city).join(",")),
      ppStats: [{ n: countries, l: tx("countries") }, { n: known.length, l: tx("catsMet") }, { n: known.length + 1, l: tx("stamps") }],
      ppTabs: [["stamps", tx("stampBook")], ["journal", tx("journal")]].map(([id, label]) => ({ label, bg: st.ppTab === id ? "#fff" : "transparent", color: st.ppTab === id ? "#010002" : "#a89f8d", shadow: st.ppTab === id ? "0 1px 3px rgba(0,0,0,.1)" : "none", tap: () => this.setState({ ppTab: id }) })),
      ppShowStamps: st.ppTab === "stamps", ppShowJournal: st.ppTab === "journal",
      stampBook,
      weekDays: [0, 1, 2, 3, 4, 5, 6].map((i) => new Intl.DateTimeFormat(LOC, { weekday: "narrow" }).format(new Date(2026, 8, 20 + i))),
      calCells,
      pf: isMe
        ? { isMe: true, isPal: false, slot: "my-cat", img: "", name: myName, age: st.age || "4", flag: "🇰🇷", city: "Seoul", country: tx("korea"), meta: tx("pfMeMeta", { n: st.sent.length }), stamp: STAMPS[0] }
        : { isMe: false, isPal: true, slot: palSlot(pid), img: palImg(pid), name: pp.name, age: pp.age, flag: pp.flag, city: pp.city, country: cName(pp), meta: tx("pfPalMeta", { d: dist(pp), since: sinceOf(pid) }), stamp: STAMPS[pp.stamp] },
      pfMePhoto: isMe && !!st.myPhoto, pfSlotShow: !(isMe && st.myPhoto),
      pfTags: isMe
        ? Object.keys(TAGS).map((k) => { const on = st.myTags.includes(k); return { label: tagLabel(k), bg: on ? "#464646" : "#F6F6F6", color: on ? "#fff" : "#000", cursor: "pointer", tap: () => this.setState((p) => ({ myTags: on ? p.myTags.filter((x) => x !== k) : [...p.myTags, k] })) }; })
        : pp.tags.map((k) => ({ label: tagLabel(k), bg: "#464646", color: "#fff", cursor: "default", tap: () => {} })),
      pfSend: () => startSend(pid),
      pfLetters: openLetters(pid),
      langOpen: !!st.langOpen,
      toggleLang: () => this.setState((p) => ({ langOpen: !p.langOpen })),
      closeLang: () => this.setState({ langOpen: false }),
      langCurrent: L.toUpperCase(),
      langCaret: st.langOpen ? "rotate(135deg) translate(-1px,-1px)" : "rotate(-45deg) translate(1px,-1px)",
      langOpts: LANGS.map(([id, label]) => ({ id, label })).map((o) => ({ ...o, bg: L === o.id ? "#F6F6F6" : "transparent", checkOpacity: L === o.id ? 1 : 0, pick: () => this.setState({ lang: o.id, langOpen: false }) })),
    };
  }
}

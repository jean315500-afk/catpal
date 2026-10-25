// The postcard shared after a first exchange with a country (the Arrived page's stamp block): drawn here, on the
// device, as a 4:5 image — the letter paper with its airmail edge, your cat's photo taped on as a polaroid, "Mochi has
// a pen pal in France!" by hand, the way it went (the two countries, how far), that country's stamp with its postmark
// over it, the date and the address. Only what's yours goes on it: never the other person's name, cat or letter.

export type Postcard = { cat: string; photo: string; say: string; from: string; to: string; km: string; date: string; stamp: string; pm: string };

const W = 1080, H = 1350;
const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
  const im = new Image();
  if (/^https?:/.test(src) && !src.startsWith(location.origin)) im.crossOrigin = "anonymous";   // a signed photo URL, kept untainted
  im.onload = () => res(im); im.onerror = () => rej(new Error("image " + src)); im.src = src;
});
const soft = <T,>(p: Promise<T>) => p.catch(() => null);

/** the words, wrapped to `w`, at most `max` lines */
function lines(ctx: CanvasRenderingContext2D, text: string, w: number, max: number) {
  const out: string[] = []; let cur = "";
  for (const word of text.split(/\s+/)) {
    const t = cur ? cur + " " + word : word;
    if (ctx.measureText(t).width > w && cur) { out.push(cur); cur = word; } else cur = t;
  }
  if (cur) out.push(cur);
  return out.slice(0, max);
}

export async function drawPostcard(p: Postcard): Promise<Blob> {
  await Promise.all(['600 88px "Caveat"', 'italic 48px "Instrument Serif"', '700 30px "DM Sans"'].map((f) => soft(document.fonts.load(f))));
  const [grain, photo, stamp, pm] = await Promise.all([soft(load("./assets/mailbox/paper-grain.webp")), soft(load(p.photo)), soft(load(p.stamp)), soft(load(p.pm))]);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;

  // the paper, and its grain
  ctx.fillStyle = "#FFFCF4"; ctx.fillRect(0, 0, W, H);
  if (grain) { ctx.save(); ctx.globalAlpha = 0.14; ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = ctx.createPattern(grain, "repeat")!; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // the airmail edge: red and blue stripes all round
  const tile = document.createElement("canvas"); tile.width = tile.height = 112;
  const t = tile.getContext("2d")!;
  t.fillStyle = "#FFFCF4"; t.fillRect(0, 0, 112, 112);
  t.translate(56, 56); t.rotate(-Math.PI / 4); t.translate(-112, -112);
  for (let x = 0, i = 0; x < 224; x += 28, i++) { t.fillStyle = ["#D9554A", "#FFFCF4", "#4C6FA5", "#FFFCF4"][i % 4]; t.fillRect(x, 0, i % 2 ? 10 : 18, 224); }
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(26, 26, W - 52, H - 52); ctx.clip("evenodd"); ctx.fillStyle = ctx.createPattern(tile, "repeat")!; ctx.fillRect(0, 0, W, H); ctx.restore();

  // their country's stamp, and its postmark pressed across it
  if (stamp) { ctx.save(); ctx.translate(900, 160); ctx.rotate((4 * Math.PI) / 180); ctx.shadowColor = "rgba(0,0,0,.22)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3; const sw = 170, sh = (stamp.height / stamp.width) * sw; ctx.drawImage(stamp, -sw / 2, -sh / 2, sw, sh); ctx.restore(); }
  if (pm) { ctx.save(); ctx.translate(790, 190); ctx.rotate((-10 * Math.PI) / 180); ctx.globalAlpha = 0.82; ctx.globalCompositeOperation = "multiply"; const mw = 280, mh = (pm.height / pm.width) * mw; ctx.drawImage(pm, -mw / 2, -mh / 2, mw, mh); ctx.restore(); }

  // your cat: a polaroid, taped on
  ctx.save(); ctx.translate(360, 560); ctx.rotate((-4 * Math.PI) / 180);
  ctx.shadowColor = "rgba(40,25,20,.25)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#fff"; ctx.fillRect(-260, -300, 520, 620);
  ctx.shadowColor = "transparent";
  if (photo) {
    const s = Math.min(photo.width, photo.height);
    ctx.drawImage(photo, (photo.width - s) / 2, (photo.height - s) / 2, s, s, -240, -280, 480, 480);
  } else { ctx.fillStyle = "#F2EEE7"; ctx.fillRect(-240, -280, 480, 480); }
  ctx.fillStyle = "#2F3B57"; ctx.font = 'italic 52px "Instrument Serif", Georgia, serif'; ctx.textAlign = "center"; ctx.fillText(p.cat, 0, 272);
  ctx.fillStyle = "rgba(242,156,122,.6)"; ctx.rotate((-5 * Math.PI) / 180); ctx.fillRect(-80, -322, 160, 44);
  ctx.restore();

  // the words, by hand
  ctx.fillStyle = "#A05245"; ctx.font = '600 92px "Caveat", cursive'; ctx.textAlign = "left";
  lines(ctx, p.say, W - 190, 2).forEach((ln, i) => ctx.fillText(ln, 92, 1010 + i * 92));

  // the way it went
  ctx.font = '700 42px "DM Sans", sans-serif'; ctx.fillStyle = "#22304A";
  const y = 1196, fromW = ctx.measureText(p.from).width, toW = ctx.measureText(p.to).width;
  ctx.fillText(p.from, 92, y); ctx.textAlign = "right"; ctx.fillText(p.to, W - 92, y); ctx.textAlign = "center";
  ctx.font = '700 34px "DM Sans", sans-serif'; ctx.fillStyle = "#C9785D";
  const kmW = ctx.measureText(p.km).width, mid = (92 + fromW + (W - 92 - toW)) / 2;
  ctx.fillText(p.km, mid, y - 2);
  ctx.strokeStyle = "#E5483D"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.setLineDash([0.1, 16]);
  ctx.beginPath(); ctx.moveTo(92 + fromW + 26, y - 12); ctx.lineTo(mid - kmW / 2 - 22, y - 12); ctx.moveTo(mid + kmW / 2 + 22, y - 12); ctx.lineTo(W - 92 - toW - 26, y - 12); ctx.stroke(); ctx.setLineDash([]);

  // when, and where to find it
  ctx.font = '500 28px ui-monospace, "SF Mono", Menlo, monospace'; ctx.fillStyle = "#8E96A6";
  ctx.textAlign = "left"; ctx.fillText(p.date.toUpperCase(), 92, 1284);
  ctx.textAlign = "right"; ctx.fillText("CATPAL.VERCEL.APP", W - 92, 1284);

  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("postcard"))), "image/png"));
}

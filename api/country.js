// GET /api/country -> { "country": "KR" }: the country this visit comes from, as Vercel sees it from the internet
// address (the x-vercel-ip-country header). Nothing is kept or logged. Empty when it isn't known (then the app guesses
// from the device's time zone and language instead).
export default function handler(req, res) {
  const cc = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).json({ country: /^[A-Z]{2}$/.test(cc) ? cc : '' });
}

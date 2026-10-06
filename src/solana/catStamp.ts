// Cat Stamp MVP: the minimal on-chain record of a CatPal stamp collected from a
// received Cat Letter, written as a JSON Memo on Solana Devnet.
//
// Privacy: only the fields below go on-chain. Never add cat photos, letter or
// message text, usernames, cat names, emails or any other personal data.

export type CatStampPayload = {
  app: 'CatPal';
  type: 'cat_stamp';
  version: 1;
  stampId: string;
  fromCountry: string; // ISO 3166-1 alpha-2
  toCountry: string; // ISO 3166-1 alpha-2
  date: string; // YYYY-MM-DD
  wallet: string; // base58 address of the connected wallet
};

export type CatStampInput = Pick<CatStampPayload, 'stampId' | 'fromCountry' | 'toCountry' | 'date'>;

/** Builds the payload with a fixed key order (so the memo text is deterministic). */
export function buildCatStampPayload(stamp: CatStampInput, wallet: string): CatStampPayload {
  return {
    app: 'CatPal',
    type: 'cat_stamp',
    version: 1,
    stampId: stamp.stampId,
    fromCountry: stamp.fromCountry,
    toCountry: stamp.toCountry,
    date: stamp.date,
    wallet,
  };
}

export const catStampMemo = (p: CatStampPayload) => JSON.stringify(p);

// ---- deriving a Cat Stamp from a real received Cat Letter ----

/** The recipient's home. CatPal users are in Seoul for now (see the profile: "Seoul, Korea"). */
export const HOME_COUNTRY = 'KR';

/** Pal country names used in CatPalLogic -> ISO 3166-1 alpha-2. */
const COUNTRY_ISO: Record<string, string> = {
  Japan: 'JP', Italy: 'IT', Taiwan: 'TW', UK: 'GB', Indonesia: 'ID', France: 'FR',
  Thailand: 'TH', Australia: 'AU', USA: 'US', Canada: 'CA', Singapore: 'SG', Korea: 'KR',
};

/** A received letter as stored in CatPalLogic state (inbox). Only id/date/country are used. */
export type ReceivedLetter = { id: string; date: string };

/** "26-09-23" (letter date) -> "2026-09-23". */
const isoDate = (d: string) => (/^\d{2}-\d{2}-\d{2}$/.test(d) ? '20' + d : d);

/**
 * The Cat Stamp collected from one received letter. stampId is derived from the
 * letter's id, so it is stable and unique per letter. Nothing else from the
 * letter (note, photo, cat name) is used.
 */
export function catStampFromLetter(letter: ReceivedLetter, palCountry: string): CatStampInput | null {
  const from = COUNTRY_ISO[palCountry];
  if (!from) return null;
  return { stampId: 'catpal-letter-' + letter.id, fromCountry: from, toCountry: HOME_COUNTRY, date: isoDate(letter.date) };
}

// ---- local record of saved stamps (one record per stampId) ----

const STORE_KEY = 'catpal:cat-stamps';
type Saved = { signature: string; wallet: string; savedAt: string };

const readAll = (): Record<string, Saved> => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
};

/** A stamp is saved at most once (whichever wallet saved it). */
export function getSavedStamp(stampId: string): Saved | undefined {
  return readAll()[stampId];
}

export function saveStampSignature(stampId: string, wallet: string, signature: string) {
  const all = readAll();
  if (all[stampId]) return;
  all[stampId] = { signature, wallet, savedAt: new Date().toISOString() };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(all)); } catch { /* storage unavailable */ }
}

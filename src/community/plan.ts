// CatPal Plus — what the paid plan is, in one place: choosing who a letter goes to (a country, a cat like yours),
// choosing its stamp, and the Fast Bird (letters to and from a Plus member land at once), a year at a time or for good.
// No payment is connected yet: joining is test-only (nothing is charged) and kept on this device; prices are examples.
import { COUNTRY_COORDS } from './countries';

/** example prices (shown as such): a year, or for good; fast birds on their own (without Plus), in a pack; how many new
 *  letters a day (replies don't count) */
export const PLAN = {
  annual: { en: '$29.99 / year', ko: '연 39,000원' }, lifetime: { en: '$59.99 once', ko: '한 번 79,000원' },
  packPrice: { en: '$1.99', ko: '2,900원' }, birdsInPack: 5, newPerDay: 3,
};

export type PlanKind = 'annual' | 'lifetime';
/** plus: on Plus; kind: a year at a time, or for good; since: when it started; renews: (a year) renewing by itself */
export type Plan = { plus: boolean; kind: PlanKind; since: string; renews: boolean; birds: number };
const KEY = 'cp-plan';
/** "?plusSample=annual" (or lifetime): the app as a Plus member sees it — this visit only, nothing kept */
const SAMPLE = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('plusSample') : null;
export const PLUS_SAMPLE = SAMPLE === 'annual' || SAMPLE === 'lifetime' || SAMPLE === '1' || SAMPLE === '';
export const readPlan = (): Plan => {
  if (PLUS_SAMPLE) return { plus: true, kind: SAMPLE === 'lifetime' ? 'lifetime' : 'annual', since: new Date(Date.now() - 41 * 864e5).toISOString(), renews: true, birds: 0 };
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    return { plus: !!p?.plus, kind: p?.kind === 'lifetime' ? 'lifetime' : 'annual', since: typeof p?.since === 'string' ? p.since : new Date().toISOString(), renews: p?.renews !== false, birds: Math.max(0, Number(p?.birds) || 0) };
  } catch { return { plus: false, kind: 'annual', since: new Date().toISOString(), renews: true, birds: 0 }; }
};
export const writePlan = (p: Plan) => { if (PLUS_SAMPLE) return; try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* this visit only */ } };
/** (a year at a time) when it next renews — or, not renewing, when it ends */
export const nextRenewal = (p: Plan) => { const d = new Date(p.since); const now = Date.now(); while (d.getTime() <= now) d.setFullYear(d.getFullYear() + 1); return d; };

const REGION_CCS: Record<string, string> = {
  asia: 'AE AF AM AZ BD BH BN BT CN CY GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR TW UZ VN YE',
  europe: 'AD AL AT BA BE BG BY CH CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SK SM UA VA',
  namerica: 'AG BB BS BZ CA CR CU DM DO GD GT HN HT JM KN LC MX NI PA PR SV TT US VC',
  samerica: 'AR BO BR CL CO EC GY PE PY SR UY VE',
  africa: 'AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RW SC SD SL SN SO SS ST SZ TD TG TN TZ UG ZA ZM ZW',
  oceania: 'AU FJ FM KI MH NR NZ PG PW SB TO TV VU WS',
};
export const REGIONS = [{ id: 'asia', icon: '🌏' }, { id: 'europe', icon: '🌍' }, { id: 'namerica', icon: '🌎' }, { id: 'samerica', icon: '🌎' }, { id: 'africa', icon: '🌍' }, { id: 'oceania', icon: '🌏' }];
const REGION_OF: Record<string, string> = {};
for (const [id, ccs] of Object.entries(REGION_CCS)) for (const cc of ccs.split(' ')) REGION_OF[cc] = id;
export const regionOf = (cc: string) => REGION_OF[cc] || '';
if (import.meta.env.DEV) { const lost = Object.keys(COUNTRY_COORDS).filter((cc) => !REGION_OF[cc]); if (lost.length) console.warn('plan: countries with no region', lost); }

/** what a cat is like (a few picked on its profile): "a cat like mine" shares at least one */
export const TRAITS = ['sleepy', 'playful', 'cuddly', 'shy', 'chatty', 'foodie', 'kitten', 'senior'];

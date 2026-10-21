// All CatPal reads/writes against Supabase (schema: supabase/schema.sql).
// Row Level Security does the access control; these helpers just shape the data.
import { supabase } from './supabase';

export type Profile = { id: string; nickname: string; country: string; show_as_recipient?: boolean; /** not in the database yet: the passport number, once issued */ passport_no?: string | null };
export type Category = 'my_cat' | 'met_cat';
export type MomentCard = {
  id: string; user_id: string; category: Category; photo_path: string; caption: string;
  cat_name: string | null; country: string; created_at: string;
  nickname: string; author_country: string; like_count: number; liked_by_me: boolean;
};
export type Thread = {
  id: string; moment_id: string | null; starter_id: string; owner_id: string; created_at: string;
  moment: { id: string; photo_path: string; caption: string; cat_name: string | null } | null;
  starter: Profile; owner: Profile;
};
export type Letter = {
  id: string; thread_id: string; sender_id: string; body: string | null; photo_path: string | null;
  stamp: number; read_at: string | null; created_at: string;
};

/** Turns a Supabase/PostgREST/Storage error into a short user-facing message. */
export function errorText(e: any): string {
  const m = String(e?.message || e || '');
  if (/anonymous sign-ins are disabled/i.test(m)) return 'Sign-in is not enabled for CatPal yet (anonymous sign-ins are off).';
  if (/schema cache|PGRST20/i.test(m) || e?.code === 'PGRST202') return 'CatPal’s database is not set up yet.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'No connection. Check your internet and try again.';
  if (/rate limit|too many/i.test(m)) return 'Too many tries. Please wait a moment and try again.';
  if (/payload too large|exceeded the maximum/i.test(m)) return 'That photo is too large.';
  return m || 'Something went wrong. Please try again.';
}

const must = <T,>({ data, error }: { data: T; error: any }): T => {
  if (error) throw error;
  return data;
};

// ---------------------------------------------------------------- auth & profile

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function signInAnonymously(): Promise<string> {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user!.id;
}

export async function getProfile(id: string): Promise<Profile | null> {
  return must(await supabase.from('profiles').select('id, nickname, country').eq('id', id).maybeSingle());
}

export async function saveProfile(id: string, nickname: string, country: string): Promise<Profile> {
  return must(await supabase.from('profiles').upsert({ id, nickname, country }).select('id, nickname, country').single());
}

// ---------------------------------------------------------------- moments & likes

export const momentPhotoUrl = (path: string) => supabase.storage.from('moments').getPublicUrl(path).data.publicUrl;

export async function discoverFeed(limit = 30): Promise<MomentCard[]> {
  return must(await supabase.rpc('discover_feed', { p_limit: limit })) || [];
}

/** Most-liked moments over the last 7 days (counted from real likes). */
export async function topThisWeek(n = 6): Promise<MomentCard[]> {
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const likes = must(await supabase.from('likes').select('moment_id').gte('created_at', since).limit(5000)) || [];
  const count: Record<string, number> = {};
  for (const l of likes) count[l.moment_id] = (count[l.moment_id] || 0) + 1;
  const ids = Object.keys(count).sort((a, b) => count[b] - count[a]).slice(0, n);
  if (!ids.length) return [];
  const rows: MomentCard[] = must(await supabase.from('moment_cards').select('*').in('id', ids)) || [];
  return rows.map((r) => ({ ...r, week_likes: count[r.id] })).sort((a: any, b: any) => b.week_likes - a.week_likes);
}

/** Recent moments from everyone (incl. you) for the Cat Map, newest first. Country level only. */
export async function mapMoments(limit = 300): Promise<MomentCard[]> {
  return must(await supabase.from('moment_cards').select('*').order('created_at', { ascending: false }).limit(limit)) || [];
}

export async function myMoments(uid: string): Promise<MomentCard[]> {
  return must(await supabase.from('moment_cards').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(60)) || [];
}

export async function momentCards(ids: string[]): Promise<MomentCard[]> {
  if (!ids.length) return [];
  return must(await supabase.from('moment_cards').select('*').in('id', ids)) || [];
}

export async function createMoment(uid: string, input: { category: Category; caption: string; cat_name: string | null; country: string }, photo: Blob) {
  const path = `${uid}/${crypto.randomUUID()}.jpg`;
  must(await supabase.storage.from('moments').upload(path, photo, { contentType: 'image/jpeg', upsert: false }));
  try {
    return must(await supabase.from('moments').insert({ user_id: uid, photo_path: path, ...input }).select('id').single());
  } catch (e) {
    await supabase.storage.from('moments').remove([path]); // don't leave an orphan photo behind
    throw e;
  }
}

export async function deleteMoment(m: { id: string; photo_path: string }) {
  must(await supabase.from('moments').delete().eq('id', m.id));
  await supabase.storage.from('moments').remove([m.photo_path]);
}

export async function setLike(momentId: string, uid: string, on: boolean) {
  if (on) {
    const { error } = await supabase.from('likes').insert({ moment_id: momentId, user_id: uid });
    if (error && error.code !== '23505') throw error; // already liked: fine
  } else {
    must(await supabase.from('likes').delete().eq('moment_id', momentId).eq('user_id', uid));
  }
}

// ---------------------------------------------------------------- threads & letters

const THREAD_COLS = 'id, moment_id, starter_id, owner_id, created_at, moment:moments(id, photo_path, caption, cat_name), starter:profiles!threads_starter_id_fkey(id, nickname, country), owner:profiles!threads_owner_id_fkey(id, nickname, country)';

export async function listThreads(): Promise<Thread[]> {
  return must(await supabase.from('threads').select(THREAD_COLS).order('created_at', { ascending: false }).limit(200)) as any || [];
}

export async function listLetters(): Promise<Letter[]> {
  return must(await supabase.from('letters').select('*').order('created_at', { ascending: true }).limit(2000)) || [];
}

/** The thread between me and a moment's owner about that moment (created if needed). */
export async function openThread(uid: string, moment: { id: string; user_id: string }): Promise<string> {
  const found = must(await supabase.from('threads').select('id').eq('moment_id', moment.id).eq('starter_id', uid).maybeSingle());
  if (found) return found.id;
  const { data, error } = await supabase.from('threads').insert({ moment_id: moment.id, starter_id: uid, owner_id: moment.user_id }).select('id').single();
  if (error?.code === '23505') return openThread(uid, moment); // created meanwhile (another tab)
  if (error) throw error;
  return data.id;
}

export async function sendLetter(uid: string, threadId: string, body: string | null, photo: Blob | null, stamp: number) {
  let photo_path: string | null = null;
  if (photo) {
    photo_path = `${threadId}/${crypto.randomUUID()}.jpg`;
    must(await supabase.storage.from('letters').upload(photo_path, photo, { contentType: 'image/jpeg', upsert: false }));
  }
  return must(await supabase.from('letters').insert({ thread_id: threadId, sender_id: uid, body, photo_path, stamp }).select('*').single()) as Letter;
}

export async function markThreadRead(threadId: string) {
  must(await supabase.rpc('mark_thread_read', { t: threadId }));
}

/** Signed URLs (1 h) for private letter photos. */
export async function letterPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const rows = must(await supabase.storage.from('letters').createSignedUrls(paths, 3600)) || [];
  const out: Record<string, string> = {};
  for (const r of rows as any[]) if (r.signedUrl && r.path) out[r.path] = r.signedUrl;
  return out;
}

// ---------------------------------------------------------------- explore (public feed)
// Served only by the explore_feed() function: no letter/thread/recipient ids ever reach the client,
// and the recipient is named only if they opted in (profiles.show_as_recipient).

export type FeedItem = {
  kind: 'moment' | 'letter'; id: string; bucket: 'moments' | 'posts'; photo_path: string; message: string | null; cat_name: string | null; created_at: string;
  author_id: string; author_nickname: string; author_country: string; recipient_nickname: string | null; recipient_country: string | null;
  like_count: number; week_likes: number; liked_by_me: boolean;
};
export type FeedSort = 'recent' | 'popular' | 'ranking';

/** true when the Explore migration hasn't been applied yet (function missing). */
export const isMissingFeature = (e: any) => e?.code === 'PGRST202' || /Could not find the function/i.test(String(e?.message || ''));

export async function exploreFeed(sort: FeedSort, limit = 50, mine = false): Promise<FeedItem[]> {
  return must(await supabase.rpc('explore_feed', { p_sort: sort, p_limit: limit, p_mine: mine })) || [];
}

export const feedPhotoUrl = (it: { bucket: string; photo_path: string }) => supabase.storage.from(it.bucket).getPublicUrl(it.photo_path).data.publicUrl;

/** Share one of my letters to Explore: a public photo COPY + the letter text (copied server-side). */
export async function publishLetter(uid: string, letterId: string, photo: Blob) {
  const path = `${uid}/${crypto.randomUUID()}.jpg`;
  must(await supabase.storage.from('posts').upload(path, photo, { contentType: 'image/jpeg', upsert: false }));
  const { data, error } = await supabase.rpc('publish_letter', { p_letter: letterId, p_photo_path: path });
  if (error) { await supabase.storage.from('posts').remove([path]); throw error; }
  return data as string;
}

export async function unpublishPost(post: { id: string; photo_path: string }) {
  must(await supabase.from('letter_posts').delete().eq('id', post.id));
  await supabase.storage.from('posts').remove([post.photo_path]);
}

export async function setPostLike(postId: string, uid: string, on: boolean) {
  if (on) {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: uid });
    if (error && error.code !== '23505') throw error;
  } else {
    must(await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', uid));
  }
}

/** Recipient-name consent (Explore migration). null when the column doesn't exist yet — never blocks sign-up. */
export async function getShowAsRecipient(uid: string): Promise<boolean | null> {
  const { data, error } = await supabase.from('profiles').select('show_as_recipient').eq('id', uid).maybeSingle();
  return error || !data ? null : !!(data as any).show_as_recipient;
}

export async function setShowAsRecipient(uid: string, on: boolean) {
  must(await supabase.from('profiles').update({ show_as_recipient: on }).eq('id', uid));
}

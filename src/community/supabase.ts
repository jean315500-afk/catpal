// Supabase client (URL + publishable key from .env.local / Vercel env).
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = !!(url && key);

/** what a link from an email brought here, read before the client takes the session out of the address:
 *  "email_change" (an email confirmed), "magiclink" (signed in), "signup"… or "" */
export const AUTH_LINK_TYPE = (() => { try { return (location.hash.match(/(?:^|[#&])type=([a-z_]+)/) || [])[1] || ''; } catch { return ''; } })();

export const supabase = createClient(url || 'http://localhost', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'catpal-auth' },
});

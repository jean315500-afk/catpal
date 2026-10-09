// Supabase client (URL + publishable key from .env.local / Vercel env).
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = !!(url && key);

export const supabase = createClient(url || 'http://localhost', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'catpal-auth' },
});

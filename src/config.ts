// These values are public and are included in the browser bundle.
// Local development can override them with VITE_* values in .env.local.
const production = import.meta.env.PROD;

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ||
  (production ? 'https://timbaixe-api.binhvo1003.workers.dev' : '')).replace(/\/$/, '');

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ||
  (production ? 'https://jiqohwewwopyssncraad.supabase.co' : '');

export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (production ? 'sb_publishable_MC4ZKpgeuKnatYdkyKLRmQ_6sk9FnJs' : '');

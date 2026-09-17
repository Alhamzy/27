// Public Supabase project configuration for the POC.
// These values are safe to expose in the browser; authorization is enforced by RLS.
// Use || instead of ?? so an accidentally configured empty Vercel env var also falls back.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gjrnqubgwtbnosegxabi.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IFGMNntvuOu5t8LHdLPduw_rVJAzP4o';

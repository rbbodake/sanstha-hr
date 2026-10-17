import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const hasValidSupabaseConfig = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  /^https:\/\/[^/]+$/.test(supabaseUrl),
);

// Keep public pages renderable when local setup is incomplete; protected data operations
// will fail with an explicit configuration error instead of an opaque URL parsing error.
export const supabase = createClient(
  hasValidSupabaseConfig ? supabaseUrl : 'https://placeholder.supabase.co',
  hasValidSupabaseConfig ? supabaseAnonKey : 'missing-supabase-anon-key',
);

export function assertSupabaseConfigured(): void {
  if (!hasValidSupabaseConfig) {
    throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
}

import { createClient } from '@supabase/supabase-js';

// Read from import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Export isConfigured check
export const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';

// Create client or mock client
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any); // fallback handled gracefully in service methods

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase configuration is missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file. Falling back to local storage mock data."
  );
}

// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Expose supabase in the browser for dev-only performance instrumentation
if (typeof window !== 'undefined') {
  // Attach without breaking production; PerformanceMonitor will guard usage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).supabase = supabase;
}

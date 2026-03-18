export interface FrontendSupabaseConfig {
  anonKey: string;
  url: string;
}

export function getFrontendSupabaseConfig(): FrontendSupabaseConfig {
  return {
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    url: import.meta.env.VITE_SUPABASE_URL ?? '',
  };
}

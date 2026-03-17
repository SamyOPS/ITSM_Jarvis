const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';

export const apiClient = {
  baseUrl: apiBaseUrl,
  supabaseUrl,
};

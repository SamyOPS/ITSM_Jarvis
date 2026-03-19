export interface SupabaseUserPayload {
  app_metadata?: {
    role?: string;
  };
  email?: string;
  id?: string;
}

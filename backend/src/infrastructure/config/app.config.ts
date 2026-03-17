import { ConfigService } from '@nestjs/config';

export type AppConfig = {
  port: number;
  frontendUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
};

export function getAppConfig(configService: ConfigService): AppConfig {
  return {
    port: Number(configService.get('PORT') ?? 3000),
    frontendUrl:
      configService.get('FRONTEND_URL') ?? 'http://localhost:5173',
    supabaseUrl: configService.get('SUPABASE_URL') ?? '',
    supabaseAnonKey: configService.get('SUPABASE_ANON_KEY') ?? '',
    supabaseServiceRoleKey:
      configService.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  };
}

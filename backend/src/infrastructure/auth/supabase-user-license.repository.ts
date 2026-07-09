import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { UserLicenseRepository } from '../../application/auth/repositories/user-license.repository';
import { UserLicenseSettings } from '../../domain/auth/user-license';
import { getBackendRuntimeConfig } from '../config/app-config';

const MAX_BILLABLE_USERS_KEY = 'max_billable_users';

type SupabaseAppSettingRow = {
  key: string;
  value: string;
};

@Injectable()
export class SupabaseUserLicenseRepository implements UserLicenseRepository {
  async getSettings(): Promise<UserLicenseSettings> {
    const config = getBackendRuntimeConfig();
    const fallbackSettings = {
      maxBillableUsers: config.maxBillableUsers,
    };

    if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
      return fallbackSettings;
    }

    const url = new URL(`${config.supabaseUrl}/rest/v1/app_settings`);
    url.searchParams.set('select', 'key,value');
    url.searchParams.set('key', `eq.${MAX_BILLABLE_USERS_KEY}`);
    url.searchParams.set('limit', '1');

    const response = await fetch(url, {
      headers: this.buildHeaders(config.supabaseServiceRoleKey),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return fallbackSettings;
      }

      throw new ServiceUnavailableException(
        `Supabase license lookup returned status ${response.status}.`,
      );
    }

    const rows = (await response.json()) as SupabaseAppSettingRow[];
    const row = rows[0];

    if (!row) {
      return fallbackSettings;
    }

    return {
      maxBillableUsers: parseNullablePositiveInteger(row.value),
    };
  }

  async updateSettings(
    settings: UserLicenseSettings,
  ): Promise<UserLicenseSettings> {
    const config = getBackendRuntimeConfig();

    if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
      throw new ServiceUnavailableException(
        'Supabase license configuration is incomplete on the backend.',
      );
    }

    const url = new URL(`${config.supabaseUrl}/rest/v1/app_settings`);
    url.searchParams.set('on_conflict', 'key');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.buildHeaders(config.supabaseServiceRoleKey),
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        key: MAX_BILLABLE_USERS_KEY,
        value:
          settings.maxBillableUsers === null
            ? ''
            : String(settings.maxBillableUsers),
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Supabase license update returned status ${response.status}.`,
      );
    }

    return {
      maxBillableUsers: settings.maxBillableUsers,
    };
  }

  private buildHeaders(serviceRoleKey: string): HeadersInit {
    return {
      Accept: 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    };
  }
}

function parseNullablePositiveInteger(value: string): number | null {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

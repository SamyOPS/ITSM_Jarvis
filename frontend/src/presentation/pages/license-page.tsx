import { type FormEvent, useEffect, useState } from 'react';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import {
  fetchUserLicense,
  updateUserLicense,
  type UserLicenseSnapshot,
} from '../../infrastructure/api/auth-api';

type LicensePageProps = {
  session: AuthSessionSnapshot;
};

export function LicensePage({ session }: LicensePageProps) {
  const [license, setLicense] = useState<UserLicenseSnapshot | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLicense(): Promise<void> {
      setErrorMessage(null);
      setIsLoading(true);

      try {
        const snapshot = await fetchUserLicense(session.accessToken);

        if (cancelled) {
          return;
        }

        setLicense(snapshot);
        setLimitInput(snapshot.maxBillableUsers?.toString() ?? '');
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(mapLicenseError(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadLicense();

    return () => {
      cancelled = true;
    };
  }, [session.accessToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextLimit = parseLimitInput(limitInput);

    if (nextLimit === 'INVALID') {
      setErrorMessage('La limite doit etre un nombre entier superieur a 0.');
      setSuccessMessage(null);

      return;
    }

    await saveLicense(nextLimit);
  }

  async function handleDisableLimit(): Promise<void> {
    setLimitInput('');
    await saveLicense(null);
  }

  async function saveLicense(maxBillableUsers: number | null): Promise<void> {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const snapshot = await updateUserLicense(
        session.accessToken,
        maxBillableUsers,
      );

      setLicense(snapshot);
      setLimitInput(snapshot.maxBillableUsers?.toString() ?? '');
      setSuccessMessage('Limite utilisateur mise a jour.');
    } catch (error) {
      setErrorMessage(mapLicenseError(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel referentials-panel admin-users-page license-page">
      <span className="panel-tag">Super admin</span>
      <h2>Licence utilisateur</h2>
      <p>
        Definissez le nombre maximum d utilisateurs actifs facturables. Les
        comptes super admin ne sont pas comptes dans cette limite.
      </p>

      {isLoading ? (
        <p className="referentials-empty-state">Chargement de la licence...</p>
      ) : null}

      {license ? (
        <div className="license-content-grid">
          <section
            className="license-stats-card"
            aria-label="Statistiques de licence"
          >
            <header className="license-card-header">
              <span>Effectifs</span>
              <strong>{formatLicenseUsageLabel(license)}</strong>
            </header>

            <div
              className="license-usage-bar"
              aria-label={`Utilisation de la licence ${formatLicenseUsagePercent(
                license,
              )}%`}
            >
              <span
                style={{
                  width: `${formatLicenseUsagePercent(license)}%`,
                }}
              />
            </div>

            <dl className="license-stats-list">
              <div>
                <dt>Limite utilisateurs</dt>
                <dd>{formatLicenseValue(license.maxBillableUsers)}</dd>
              </div>
              <div>
                <dt>Utilisateurs actifs comptés</dt>
                <dd>{license.billableActiveUsers}</dd>
              </div>
              <div>
                <dt>Places restantes</dt>
                <dd>{formatLicenseValue(license.remainingBillableUsers)}</dd>
              </div>
            </dl>
          </section>

          <form
            className="referentials-form-card license-form-card"
            onSubmit={handleSubmit}
          >
            <header className="license-card-header">
              <span>Modification</span>
              <strong>SUPER_ADMIN</strong>
            </header>

            <label className="field">
              <span>Limite d utilisateurs facturables</span>
              <input
                min={1}
                onChange={(event) => setLimitInput(event.target.value)}
                placeholder="Ex. 25"
                type="number"
                value={limitInput}
              />
            </label>

            <p>
              Laissez le champ vide puis cliquez sur "Desactiver la limite" si
              vous ne voulez pas bloquer la creation d utilisateurs.
            </p>

            {errorMessage ? (
              <p className="ticket-form-error">{errorMessage}</p>
            ) : null}

            {successMessage ? (
              <p className="referentials-empty-state">{successMessage}</p>
            ) : null}

            <div className="admin-user-actions">
              <button
                className="primary-button admin-user-save-button"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                className="secondary-button"
                disabled={isSaving}
                onClick={handleDisableLimit}
                type="button"
              >
                Desactiver la limite
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function parseLimitInput(value: string): number | null | 'INVALID' {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return 'INVALID';
  }

  return parsedValue;
}

function formatLicenseValue(value: number | null): string | number {
  return value === null ? 'Illimité' : value;
}

function formatLicenseUsagePercent(license: UserLicenseSnapshot): number {
  if (!license.maxBillableUsers) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((license.billableActiveUsers / license.maxBillableUsers) * 100),
  );
}

function formatLicenseUsageLabel(license: UserLicenseSnapshot): string {
  if (license.maxBillableUsers === null) {
    return 'Illimite';
  }

  return `${formatLicenseUsagePercent(license)}% utilise`;
}

function mapLicenseError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Erreur inconnue pendant la mise a jour de la licence.';
  }

  if (error.message.includes('Maximum billable users')) {
    return 'La limite ne peut pas etre inferieure au nombre d utilisateurs actifs actuels.';
  }

  return error.message || 'Impossible de mettre a jour la licence.';
}

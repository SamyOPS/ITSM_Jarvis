import * as React from 'react';
import { motion } from 'framer-motion';
import { Check, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type LoginCardProps = {
  defaultAppRole: string;
  defaultEmail: string;
  defaultPassword: string;
  errorMessage: string | null;
  isBusy: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  otherAccounts: string[];
  password: string;
  value: string;
};

export default function LoginCard({
  defaultAppRole,
  defaultEmail,
  defaultPassword,
  errorMessage,
  isBusy,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  otherAccounts,
  password,
  value,
}: LoginCardProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] border border-white/55 bg-white/72 p-2 shadow-[0_24px_80px_rgba(16,37,70,0.16)] backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(68,131,255,0.16),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(20,184,166,0.12),_transparent_34%)]" />
      <div className="relative grid overflow-hidden rounded-[1.6rem] bg-slate-950 text-white lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative hidden min-h-[640px] flex-col justify-between overflow-hidden p-10 lg:flex">
          <img
            alt="Poste de support informatique"
            className="absolute inset-0 h-full w-full object-cover opacity-20"
            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80"
          />
          <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(7,17,40,0.94)_0%,rgba(11,27,62,0.84)_55%,rgba(4,10,24,0.96)_100%)]" />

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="relative space-y-6"
            initial={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-100">
              <Sparkles className="h-3.5 w-3.5" />
              Jarvis Connect
            </div>
            <div className="space-y-4">
              <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-[-0.05em] text-white">
                Connectez-vous à votre portail de support et reprenez vos
                tickets sans friction.
              </h2>
              <p className="max-w-xl text-sm leading-7 text-slate-200/88">
                Interface de connexion pensée pour un outil de ticketing : accès
                clair, rôles maîtrisés et intégration directe avec Supabase et
                l’API NestJS.
              </p>
            </div>
          </motion.div>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="relative grid gap-4 text-sm text-slate-100"
            initial={{ opacity: 0, y: 24 }}
            transition={{ delay: 0.1, duration: 0.45, ease: 'easeOut' }}
          >
            <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-sky-100">
                <ShieldCheck className="h-5 w-5" />
                <span className="font-semibold">Accès sécurisé par rôle</span>
              </div>
              <ul className="grid gap-2 pl-1 text-slate-200/90">
                <li>Profil par défaut : {defaultAppRole}</li>
                <li>Comptes de test : {otherAccounts.join(' / ')}</li>
                <li>Session locale restaurée après rechargement</li>
              </ul>
            </div>
          </motion.div>
        </div>

        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="relative flex min-h-[640px] items-center bg-[linear-gradient(180deg,#fbfcff_0%,#f0f5ff_46%,#f7faff_100%)] p-6 text-slate-950 sm:p-10"
          initial={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
        >
          <div className="mx-auto w-full max-w-md space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-white">
                <LockKeyhole className="h-3.5 w-3.5" />
                Connexion P1.4 / P1.5
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                  Se connecter
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Authentifiez-vous avec votre compte Supabase, restaurez votre
                  session locale et validez votre accès auprès du backend.
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    autoComplete="email"
                    className="pl-11"
                    id="email"
                    onChange={(event) => onEmailChange(event.target.value)}
                    placeholder="vous@jarvis.fr"
                    type="email"
                    value={value}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  autoComplete="current-password"
                  id="password"
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-slate-600">
                  <span className="relative flex h-4 w-4 items-center justify-center rounded-[4px] border border-slate-300 bg-white shadow-sm shadow-slate-200/80">
                    <input
                      checked={showPassword}
                      className="peer absolute inset-0 cursor-pointer opacity-0"
                      onChange={(event) =>
                        setShowPassword(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <Check className="h-3 w-3 text-blue-600 opacity-0 transition peer-checked:opacity-100" />
                  </span>
                  Afficher le mot de passe
                </label>
              </div>

              <Button
                className="w-full"
                disabled={isBusy}
                size="lg"
                type="submit"
              >
                {isBusy ? 'Connexion en cours...' : 'Accéder à l’espace'}
              </Button>
            </form>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm shadow-slate-200/70">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  E-mail de test
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {defaultEmail}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm shadow-slate-200/70">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Mot de passe de test
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {defaultPassword}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm shadow-slate-200/70 sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  État de connexion
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {errorMessage ??
                    'Prêt. Utilisez un compte demandeur, agent ou administrateur pour continuer.'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

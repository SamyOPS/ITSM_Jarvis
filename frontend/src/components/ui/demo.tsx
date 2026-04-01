import LoginCard from '@/components/ui/login-card';

export default function DemoOne() {
  return (
    <LoginCard
      defaultAppRole="DEMANDEUR"
      defaultEmail="demandeur@jarvis.fr"
      defaultPassword="Demandeur123!"
      errorMessage={null}
      isBusy={false}
      onEmailChange={() => undefined}
      onPasswordChange={() => undefined}
      onSubmit={(event) => event.preventDefault()}
      otherAccounts={['admin@jarvis.fr', 'agent@jarvis.fr']}
      password=""
      value=""
    />
  );
}

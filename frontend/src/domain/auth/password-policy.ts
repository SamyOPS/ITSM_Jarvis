export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MIN_LENGTH_MESSAGE =
  'Le mot de passe doit contenir au moins 8 caracteres.';

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return PASSWORD_MIN_LENGTH_MESSAGE;
  }

  return null;
}

import { BadRequestException } from '@nestjs/common';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MIN_LENGTH_MESSAGE =
  'Le mot de passe doit contenir au moins 8 caracteres.';

export function assertPasswordMeetsPolicy(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new BadRequestException(PASSWORD_MIN_LENGTH_MESSAGE);
  }
}

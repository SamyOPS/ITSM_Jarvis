import { SetMetadata } from '@nestjs/common';
import { type AuthPolicy } from '../../../domain/auth/auth-policy';

export const POLICIES_KEY = 'policies';

export const Policies = (...policies: AuthPolicy[]) =>
  SetMetadata(POLICIES_KEY, policies);

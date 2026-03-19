import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';

export const CurrentUser = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): AuthenticatedUser | undefined => {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    return request.user;
  },
);

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type Request } from 'express';
import { GetAuthenticatedUserUseCase } from '../../../application/auth/use-cases/get-authenticated-user.use-case';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(
    private readonly getAuthenticatedUserUseCase: GetAuthenticatedUserUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = this.extractBearerToken(request);

    request.user = await this.getAuthenticatedUserUseCase.execute(accessToken);

    return true;
  }

  private extractBearerToken(request: Request): string {
    const header = request.headers.authorization;

    if (!header) {
      throw new UnauthorizedException('Missing Authorization header.');
    }

    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization header format.');
    }

    return token;
  }
}

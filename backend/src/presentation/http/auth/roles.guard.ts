import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request } from 'express';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';
import { AuthPolicy } from '../../../domain/auth/auth-policy';
import {
  canManageAssets,
  canManageKnowledgeBase,
  canValidateKnowledgeBase,
} from '../../../domain/auth/user-capabilities';
import {
  isSupportManagerRole,
  isSupportRole,
  UserRole,
  type UserRole as UserRoleType,
} from '../../../domain/auth/user-role';
import { POLICIES_KEY } from './policies.decorator';
import { ROLES_KEY } from './roles.decorator';

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<readonly UserRoleType[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const requiredPolicies =
      this.reflector.getAllAndOverride<readonly AuthPolicy[]>(POLICIES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0 && requiredPolicies.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authenticated user context is missing.');
    }

    const hasRequiredRole =
      requiredRoles.length === 0 ||
      requiredRoles.includes(user.role) ||
      (user.role === UserRole.SUPER_ADMIN &&
        requiredRoles.includes(UserRole.ADMIN));

    if (!hasRequiredRole) {
      throw new ForbiddenException('Insufficient role for this resource.');
    }

    const hasRequiredPolicies = requiredPolicies.every((policy) =>
      this.evaluatePolicy(policy, user),
    );

    if (!hasRequiredPolicies) {
      throw new ForbiddenException('Access policy denied.');
    }

    return true;
  }

  private evaluatePolicy(policy: AuthPolicy, user: AuthenticatedUser): boolean {
    switch (policy) {
      case AuthPolicy.ACCESS_ADMIN_AREA:
      case AuthPolicy.MANAGE_REFERENTIALS:
        return isSupportManagerRole(user.role);
      case AuthPolicy.MANAGE_ASSETS:
        return canManageAssets(user);
      case AuthPolicy.MANAGE_KNOWLEDGE_BASE:
        return canManageKnowledgeBase(user);
      case AuthPolicy.VALIDATE_KNOWLEDGE_BASE:
        return canValidateKnowledgeBase(user);
      case AuthPolicy.ACCESS_AGENT_AREA:
        return isSupportRole(user.role);
      default:
        return false;
    }
  }
}

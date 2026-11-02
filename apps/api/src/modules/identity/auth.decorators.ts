import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';

import type { AuthenticatedRequest, SessionUser } from './auth.types.js';

export const IS_PUBLIC_KEY = 'identity:isPublic';

/** Opens a route (or every route of a controller) to callers that are not signed in. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** The signed-in caller of the request. Not available on `@Public()` routes. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser => {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) throw new Error('@CurrentUser() needs a route that is not @Public()');
    return user;
  },
);

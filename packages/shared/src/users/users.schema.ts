import { z } from 'zod';

/** Query of `GET /users`: members of the caller's team; admins may pick another team. */
export const userListQuery = z.object({ teamId: z.uuid().optional() });
export type UserListQuery = z.output<typeof userListQuery>;

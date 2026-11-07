import { Prisma } from '@/generated/prisma/client.js';

/** Prisma error codes the repositories handle: https://www.prisma.io/docs/orm/reference/error-reference */
export const PRISMA_ERROR_CODES = {
  uniqueViolation: 'P2002',
} as const;

export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === PRISMA_ERROR_CODES.uniqueViolation;

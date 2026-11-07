import { z } from 'zod';

export const PAGE_SIZE_DEFAULT = 25;
export const PAGE_SIZE_MAX = 100;

/** Query params shared by every list endpoint (slice 1.3, Q6): offset pagination. */
export const pageQuery = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
};

/** Response of every list endpoint. */
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

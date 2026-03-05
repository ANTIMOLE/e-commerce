import type { PaginationParams, PaginatedResult } from "../types";

export const DEFAULT_PAGE  = 1;
export const DEFAULT_LIMIT = 12;
export const MAX_LIMIT     = 50;

export function normalizePagination(params: PaginationParams): {
  page:   number;
  limit:  number;
  skip:   number;
  take:   number;
} {
  const page  = Math.max(1, params.page  ?? DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? DEFAULT_LIMIT));
  const skip  = (page - 1) * limit;

  return { page, limit, skip, take: limit };
}

export function buildPaginatedResult<T>(
  data:       T[],
  totalCount: number,
  page:       number,
  limit:      number
): PaginatedResult<T> {
  const totalPages = Math.ceil(totalCount / limit);

  return {
    data,
    totalCount,
    page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

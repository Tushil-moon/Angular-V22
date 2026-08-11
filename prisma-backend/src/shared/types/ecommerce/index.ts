export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface IdParam {
  id: string;
}

export interface SortQuery {
  sort?: string;
  order?: "asc" | "desc";
}

export interface DateRangeQuery {
  from?: string;
  to?: string;
}

export interface SearchQuery {
  search?: string;
}

export type ListQuery = SearchQuery & SortQuery & DateRangeQuery;

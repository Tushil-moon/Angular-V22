/**
 * Thin Observable helpers over HttpClientService for the admin CRUD modules.
 *
 * Backend contract: list endpoints return `ApiPaginatedPayload`, single endpoints
 * return the entity payload, and every key on the wire is snake_case.
 */

import type { FilterOptions, PaginatedResponse } from '@models/index';
import type { HttpClientService } from '@services/http-client.service';
import { type ApiPaginatedPayload, mapApiPaginated } from '@utils/api-mappers';
import { map, Observable } from 'rxjs';

import { buildListParams, type ListQueryParams } from './list-params.util';

export function crudList<TApi, TModel>(
    http: HttpClientService,
    path: string,
    mapItem: (payload: TApi) => TModel,
    filters: FilterOptions = {},
    extra: ListQueryParams = {},
): Observable<PaginatedResponse<TModel>> {
    return http
        .get<ApiPaginatedPayload<TApi>>(path, { params: buildListParams(filters, extra) })
        .pipe(map((response) => mapApiPaginated(response.data, mapItem)));
}

export function crudGet<TApi, TModel>(
    http: HttpClientService,
    path: string,
    mapItem: (payload: TApi) => TModel,
): Observable<TModel | null> {
    return http
        .get<TApi>(path)
        .pipe(map((response) => (response.data ? mapItem(response.data) : null)));
}

export function crudCreate<TApi, TModel>(
    http: HttpClientService,
    path: string,
    body: unknown,
    mapItem: (payload: TApi) => TModel,
): Observable<TModel | null> {
    return http
        .post<TApi>(path, body)
        .pipe(map((response) => (response.data ? mapItem(response.data) : null)));
}

export function crudPatch<TApi, TModel>(
    http: HttpClientService,
    path: string,
    body: unknown,
    mapItem: (payload: TApi) => TModel,
): Observable<TModel | null> {
    return http
        .patch<TApi>(path, body)
        .pipe(map((response) => (response.data ? mapItem(response.data) : null)));
}

export function crudDelete(http: HttpClientService, path: string): Observable<void> {
    return http.delete(path).pipe(map(() => undefined));
}

/** Modules without a delete endpoint still need a `deleteFn` for the list shell. */
export function noopDelete(): Observable<void> {
    return new Observable<void>((subscriber) => {
        subscriber.error(new Error('Delete is not supported for this resource.'));
    });
}

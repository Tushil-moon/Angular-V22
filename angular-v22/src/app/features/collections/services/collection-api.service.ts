/**
 * Collection API — Observable client for /collections
 */

import { inject, Injectable } from '@angular/core';
import { buildListParams } from '@features/shared/admin-list.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import { type ApiPaginatedPayload, mapApiPaginated } from '@utils/api-mappers';
import { map, Observable } from 'rxjs';

import {
    ApiCollectionPayload,
    Collection,
    CollectionStatus,
    CollectionType,
    CreateCollectionRequest,
    UpdateCollectionRequest,
} from '../models/collection.model';

export function mapApiCollection(payload: ApiCollectionPayload): Collection {
    return {
        id: payload.id,
        name: payload.name,
        slug: payload.slug,
        description: payload.description ?? null,
        type: (payload.type as CollectionType) ?? 'MANUAL',
        featured: Boolean(payload.featured),
        status: (payload.status as CollectionStatus) ?? 'DRAFT',
        sortOrder: payload.sort_order ?? 0,
        productCount: payload._count?.products ?? 0,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
    };
}

@Injectable({
    providedIn: 'root',
})
export class CollectionApiService {
    private readonly http = inject(HttpClientService);

    list(filters: FilterOptions = {}): Observable<PaginatedResponse<Collection>> {
        return this.http
            .get<ApiPaginatedPayload<ApiCollectionPayload>>('/collections', {
                params: buildListParams(filters),
            })
            .pipe(map((response) => mapApiPaginated(response.data, mapApiCollection)));
    }

    getById(id: string): Observable<Collection | null> {
        return this.http
            .get<ApiCollectionPayload>(`/collections/${id}`)
            .pipe(map((response) => (response.data ? mapApiCollection(response.data) : null)));
    }

    create(payload: CreateCollectionRequest): Observable<Collection | null> {
        return this.http
            .post<ApiCollectionPayload>('/collections', {
                name: payload.name,
                slug: payload.slug,
                description: payload.description ?? undefined,
                type: payload.type ?? 'MANUAL',
                status: payload.status ?? 'PUBLISHED',
            })
            .pipe(map((response) => (response.data ? mapApiCollection(response.data) : null)));
    }

    update(id: string, payload: UpdateCollectionRequest): Observable<Collection | null> {
        return this.http
            .patch<ApiCollectionPayload>(`/collections/${id}`, payload)
            .pipe(map((response) => (response.data ? mapApiCollection(response.data) : null)));
    }

    delete(id: string): Observable<void> {
        return this.http.delete(`/collections/${id}`).pipe(map(() => undefined));
    }
}

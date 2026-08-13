/**
 * Collection API — Observable client for /collections
 */

import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import { crudCreate, crudDelete, crudGet, crudList, crudPatch } from '../../shared/crud-api.util';
import type {
    ApiCollectionPayload,
    Collection,
    CollectionListFilters,
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

@Injectable({ providedIn: 'root' })
export class CollectionApiService {
    private readonly http = inject(HttpClientService);

    list(filters: CollectionListFilters = {}): Observable<PaginatedResponse<Collection>> {
        return crudList(
            this.http,
            '/collections',
            mapApiCollection,
            filters as FilterOptions,
            {
                status: filters.status || undefined,
                sort: filters.sortBy || undefined,
                order: filters.sortOrder || undefined,
            },
        );
    }

    getById(id: string): Observable<Collection | null> {
        return crudGet(this.http, `/collections/${id}`, mapApiCollection);
    }

    create(payload: CreateCollectionRequest): Observable<Collection | null> {
        return crudCreate(
            this.http,
            '/collections',
            {
                name: payload.name,
                slug: payload.slug,
                description: payload.description ?? undefined,
                type: payload.type ?? 'MANUAL',
                status: payload.status ?? 'PUBLISHED',
                featured: payload.featured ?? false,
                sortOrder: payload.sortOrder ?? 0,
            },
            mapApiCollection,
        );
    }

    update(id: string, payload: UpdateCollectionRequest): Observable<Collection | null> {
        return crudPatch(
            this.http,
            `/collections/${id}`,
            {
                ...(payload.name !== undefined ? { name: payload.name } : {}),
                ...(payload.slug !== undefined ? { slug: payload.slug } : {}),
                ...(payload.description !== undefined
                    ? { description: payload.description }
                    : {}),
                ...(payload.type !== undefined ? { type: payload.type } : {}),
                ...(payload.status !== undefined ? { status: payload.status } : {}),
                ...(payload.featured !== undefined ? { featured: payload.featured } : {}),
                ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
            },
            mapApiCollection,
        );
    }

    delete(id: string): Observable<void> {
        return crudDelete(this.http, `/collections/${id}`);
    }
}

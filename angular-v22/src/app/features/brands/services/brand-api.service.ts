/**
 * Brand API — Observable client for /brands
 */

import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import type { Observable } from 'rxjs';

import { crudCreate, crudDelete, crudGet, crudList, crudPatch } from '../../shared/crud-api.util';
import type {
    ApiBrandPayload,
    Brand,
    BrandListFilters,
    BrandStatus,
    CreateBrandRequest,
    UpdateBrandRequest,
} from '../models/brand.model';

export function mapApiBrand(payload: ApiBrandPayload): Brand {
    return {
        id: payload.id,
        name: payload.name,
        slug: payload.slug,
        description: payload.description ?? null,
        website: payload.website ?? null,
        status: (payload.status as BrandStatus) ?? 'DRAFT',
        sortOrder: payload.sort_order ?? 0,
        productCount: payload._count?.products ?? 0,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
    };
}

@Injectable({ providedIn: 'root' })
export class BrandApiService {
    private readonly http = inject(HttpClientService);

    list(filters: BrandListFilters = {}): Observable<PaginatedResponse<Brand>> {
        return crudList(
            this.http,
            '/brands',
            mapApiBrand,
            filters as FilterOptions,
            {
                status: filters.status || undefined,
                sort: filters.sortBy || undefined,
                order: filters.sortOrder || undefined,
            },
        );
    }

    getById(id: string): Observable<Brand | null> {
        return crudGet(this.http, `/brands/${id}`, mapApiBrand);
    }

    create(payload: CreateBrandRequest): Observable<Brand | null> {
        return crudCreate(
            this.http,
            '/brands',
            {
                name: payload.name,
                slug: payload.slug,
                description: payload.description ?? undefined,
                website: payload.website || undefined,
                status: payload.status ?? 'PUBLISHED',
                sortOrder: payload.sortOrder ?? 0,
            },
            mapApiBrand,
        );
    }

    update(id: string, payload: UpdateBrandRequest): Observable<Brand | null> {
        return crudPatch(
            this.http,
            `/brands/${id}`,
            {
                ...(payload.name !== undefined ? { name: payload.name } : {}),
                ...(payload.slug !== undefined ? { slug: payload.slug } : {}),
                ...(payload.description !== undefined
                    ? { description: payload.description }
                    : {}),
                ...(payload.website !== undefined ? { website: payload.website || '' } : {}),
                ...(payload.status !== undefined ? { status: payload.status } : {}),
                ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
            },
            mapApiBrand,
        );
    }

    delete(id: string): Observable<void> {
        return crudDelete(this.http, `/brands/${id}`);
    }
}

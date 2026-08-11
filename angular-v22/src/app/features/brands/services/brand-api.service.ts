/**
 * Brand API — Observable client for /brands
 */

import { inject, Injectable } from '@angular/core';
import { buildListParams } from '@features/shared/admin-list.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import { type ApiPaginatedPayload, mapApiPaginated } from '@utils/api-mappers';
import { map, Observable } from 'rxjs';

import {
    ApiBrandPayload,
    Brand,
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

@Injectable({
    providedIn: 'root',
})
export class BrandApiService {
    private readonly http = inject(HttpClientService);

    list(filters: FilterOptions = {}): Observable<PaginatedResponse<Brand>> {
        return this.http
            .get<ApiPaginatedPayload<ApiBrandPayload>>('/brands', {
                params: buildListParams(filters),
            })
            .pipe(map((response) => mapApiPaginated(response.data, mapApiBrand)));
    }

    getById(id: string): Observable<Brand | null> {
        return this.http
            .get<ApiBrandPayload>(`/brands/${id}`)
            .pipe(map((response) => (response.data ? mapApiBrand(response.data) : null)));
    }

    create(payload: CreateBrandRequest): Observable<Brand | null> {
        return this.http
            .post<ApiBrandPayload>('/brands', {
                name: payload.name,
                slug: payload.slug,
                description: payload.description ?? undefined,
                website: payload.website ?? undefined,
                status: payload.status ?? 'PUBLISHED',
            })
            .pipe(map((response) => (response.data ? mapApiBrand(response.data) : null)));
    }

    update(id: string, payload: UpdateBrandRequest): Observable<Brand | null> {
        return this.http
            .patch<ApiBrandPayload>(`/brands/${id}`, payload)
            .pipe(map((response) => (response.data ? mapApiBrand(response.data) : null)));
    }

    delete(id: string): Observable<void> {
        return this.http.delete(`/brands/${id}`).pipe(map(() => undefined));
    }
}

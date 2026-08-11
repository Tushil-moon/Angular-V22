/**
 * Product API — Observable client for /products
 */

import { inject, Injectable } from '@angular/core';
import { PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import { ApiPaginatedPayload, mapApiPaginated } from '@utils/api-mappers';
import { map, Observable } from 'rxjs';

import {
    ApiProductPayload,
    CreateProductRequest,
    Product,
    ProductListFilters,
    ProductStatus,
    ProductType,
    UpdateProductRequest,
} from '../models/product.model';

export function mapApiProduct(payload: ApiProductPayload): Product {
    return {
        id: payload.id,
        name: payload.name,
        slug: payload.slug,
        description: payload.description ?? null,
        shortDescription: payload.short_description ?? null,
        type: (payload.type as ProductType) ?? 'SIMPLE',
        status: (payload.status as ProductStatus) ?? 'DRAFT',
        featured: Boolean(payload.featured),
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
    };
}

@Injectable({
    providedIn: 'root',
})
export class ProductApiService {
    private readonly http = inject(HttpClientService);

    list(filters: ProductListFilters = {}): Observable<PaginatedResponse<Product>> {
        const params: Record<string, string | number | boolean | undefined> = {
            page: filters.page ?? 1,
            page_size: filters.pageSize ?? 10,
            search: filters.search || undefined,
            status: filters.status || undefined,
            sort: filters.sortBy,
            order: filters.sortOrder,
        };

        return this.http.get<ApiPaginatedPayload<ApiProductPayload>>('/products', { params }).pipe(
            map((response) => mapApiPaginated(response.data, mapApiProduct)),
        );
    }

    getById(id: string): Observable<Product | null> {
        return this.http.get<ApiProductPayload>(`/products/${id}`).pipe(
            map((response) => (response.data ? mapApiProduct(response.data) : null)),
        );
    }

    create(payload: CreateProductRequest): Observable<Product | null> {
        return this.http
            .post<ApiProductPayload>('/products', {
                name: payload.name,
                slug: payload.slug,
                description: payload.description ?? null,
                type: payload.type ?? 'SIMPLE',
                status: payload.status ?? 'DRAFT',
            })
            .pipe(map((response) => (response.data ? mapApiProduct(response.data) : null)));
    }

    update(id: string, payload: UpdateProductRequest): Observable<Product | null> {
        return this.http
            .patch<ApiProductPayload>(`/products/${id}`, payload)
            .pipe(map((response) => (response.data ? mapApiProduct(response.data) : null)));
    }

    delete(id: string): Observable<void> {
        return this.http.delete(`/products/${id}`).pipe(map(() => undefined));
    }

    publish(id: string): Observable<Product | null> {
        return this.http
            .post<ApiProductPayload>(`/products/${id}/publish`, {})
            .pipe(map((response) => (response.data ? mapApiProduct(response.data) : null)));
    }

    archive(id: string): Observable<Product | null> {
        return this.http
            .post<ApiProductPayload>(`/products/${id}/archive`, {})
            .pipe(map((response) => (response.data ? mapApiProduct(response.data) : null)));
    }
}

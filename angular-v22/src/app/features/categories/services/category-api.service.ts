/**
 * Category API — Observable client for /categories
 */

import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import { readFilter } from '../../shared/list-params.util';
import { crudCreate, crudDelete, crudGet, crudList, crudPatch } from '../../shared/crud-api.util';
import type {
    ApiCategoryPayload,
    ApiCategoryTreeNode,
    Category,
    CategoryStatus,
    CategoryTreeNode,
    CreateCategoryRequest,
    UpdateCategoryRequest,
} from '../models/category.model';

export function mapApiCategoryTreeNode(payload: ApiCategoryTreeNode): CategoryTreeNode {
    return {
        id: payload.id,
        parentId: payload.parent_id ?? payload.parentId ?? null,
        name: payload.name,
        slug: payload.slug,
        status: (payload.status as CategoryStatus) ?? 'PUBLISHED',
        sortOrder: payload.sort_order ?? payload.sortOrder ?? 0,
        children: (payload.children ?? []).map(mapApiCategoryTreeNode),
    };
}

export function mapApiCategory(payload: ApiCategoryPayload): Category {
    return {
        id: payload.id,
        name: payload.name,
        slug: payload.slug,
        description: payload.description ?? null,
        parentId: payload.parent_id ?? null,
        parentName: payload.parent?.name ?? null,
        status: (payload.status as CategoryStatus) ?? 'DRAFT',
        sortOrder: payload.sort_order ?? 0,
        productCount: payload._count?.products ?? 0,
        childCount: payload._count?.children ?? 0,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
    };
}

@Injectable({ providedIn: 'root' })
export class CategoryApiService {
    private readonly http = inject(HttpClientService);

    list(filters: FilterOptions = {}): Observable<PaginatedResponse<Category>> {
        return crudList(this.http, '/categories', mapApiCategory, filters, {
            status: readFilter(filters, 'status'),
        });
    }

    getById(id: string): Observable<Category | null> {
        return crudGet(this.http, `/categories/${id}`, mapApiCategory);
    }

    create(payload: CreateCategoryRequest): Observable<Category | null> {
        return crudCreate(
            this.http,
            '/categories',
            {
                name: payload.name,
                slug: payload.slug,
                description: payload.description ?? undefined,
                parentId: payload.parentId ?? undefined,
                status: payload.status ?? 'PUBLISHED',
            },
            mapApiCategory,
        );
    }

    update(id: string, payload: UpdateCategoryRequest): Observable<Category | null> {
        return crudPatch(this.http, `/categories/${id}`, payload, mapApiCategory);
    }

    delete(id: string): Observable<void> {
        return crudDelete(this.http, `/categories/${id}`);
    }

    tree(): Observable<CategoryTreeNode[]> {
        return this.http
            .get<ApiCategoryTreeNode[]>('/categories/tree')
            .pipe(map((response) => (response.data ?? []).map(mapApiCategoryTreeNode)));
    }
}

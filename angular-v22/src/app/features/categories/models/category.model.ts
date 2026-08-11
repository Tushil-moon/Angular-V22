import type { CatalogStatus } from '@features/shared/admin-list.util';

export type CategoryStatus = CatalogStatus;

export interface Category {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    parentName: string | null;
    status: CategoryStatus;
    sortOrder: number;
    productCount: number;
    childCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCategoryRequest {
    name: string;
    slug: string;
    description?: string | null;
    parentId?: string | null;
    status?: CategoryStatus;
}

export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;

export interface ApiCategoryPayload {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    parent_id?: string | null;
    status?: string;
    sort_order?: number;
    created_at?: string;
    updated_at?: string;
    parent?: { id: string; name: string; slug: string } | null;
    _count?: { children?: number; products?: number };
}

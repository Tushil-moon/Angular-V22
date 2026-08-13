import type { CatalogStatus } from '@features/shared/admin-list.util';

export type CollectionStatus = CatalogStatus;
export type CollectionType = 'MANUAL' | 'RULE_BASED';

export interface Collection {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    type: CollectionType;
    featured: boolean;
    status: CollectionStatus;
    sortOrder: number;
    productCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCollectionRequest {
    name: string;
    slug: string;
    description?: string | null;
    type?: CollectionType;
    status?: CollectionStatus;
    featured?: boolean;
    sortOrder?: number;
}

export type UpdateCollectionRequest = Partial<CreateCollectionRequest>;

export interface CollectionListFilters {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: CollectionStatus;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface ApiCollectionPayload {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    type?: string;
    featured?: boolean;
    status?: string;
    sort_order?: number;
    created_at?: string;
    updated_at?: string;
    _count?: { products?: number };
}

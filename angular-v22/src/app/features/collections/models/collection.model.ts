import type { CatalogStatus } from '@features/shared/admin-list.util';

export type CollectionStatus = CatalogStatus;
export type CollectionType = 'MANUAL' | 'AUTOMATED';

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
}

export type UpdateCollectionRequest = Partial<CreateCollectionRequest>;

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

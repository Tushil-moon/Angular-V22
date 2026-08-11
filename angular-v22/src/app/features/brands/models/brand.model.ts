import type { CatalogStatus } from '@features/shared/admin-list.util';

export type BrandStatus = CatalogStatus;

export interface Brand {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    website: string | null;
    status: BrandStatus;
    sortOrder: number;
    productCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateBrandRequest {
    name: string;
    slug: string;
    description?: string | null;
    website?: string | null;
    status?: BrandStatus;
}

export type UpdateBrandRequest = Partial<CreateBrandRequest>;

export interface ApiBrandPayload {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    website?: string | null;
    status?: string;
    sort_order?: number;
    created_at?: string;
    updated_at?: string;
    _count?: { products?: number };
}

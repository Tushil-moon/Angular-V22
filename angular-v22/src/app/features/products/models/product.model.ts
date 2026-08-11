export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ProductType =
    | 'SIMPLE'
    | 'VARIABLE'
    | 'DIGITAL'
    | 'PHYSICAL'
    | 'SUBSCRIPTION'
    | 'BUNDLE';

export interface Product {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    shortDescription: string | null;
    type: ProductType;
    status: ProductStatus;
    featured: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProductListFilters {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: ProductStatus | '';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface CreateProductRequest {
    name: string;
    slug: string;
    description?: string | null;
    type?: ProductType;
    status?: ProductStatus;
}

export interface UpdateProductRequest {
    name?: string;
    slug?: string;
    description?: string | null;
    type?: ProductType;
    status?: ProductStatus;
}

export interface ApiProductPayload {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    short_description?: string | null;
    type?: string;
    status?: string;
    featured?: boolean;
    created_at?: string;
    updated_at?: string;
}

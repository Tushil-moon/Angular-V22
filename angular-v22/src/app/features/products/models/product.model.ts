export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ProductType =
    | 'SIMPLE'
    | 'VARIABLE'
    | 'DIGITAL'
    | 'PHYSICAL'
    | 'SUBSCRIPTION'
    | 'BUNDLE';

export type ProductVisibility = 'VISIBLE' | 'HIDDEN' | 'CATALOG_ONLY' | 'SEARCH_ONLY';

export interface ProductBrand {
    id: string;
    name: string;
    slug: string;
}

export interface ProductCategoryRef {
    id: string;
    name: string;
    slug: string;
}

export interface ProductVariant {
    id: string;
    sku: string;
    title: string | null;
    price: number;
    compareAtPrice: number | null;
    status: ProductStatus;
    barcode: string | null;
    trackInventory: boolean;
}

export interface ProductImage {
    id: string;
    url: string;
    altText: string | null;
    position: number;
    mediaId?: string | null;
}

export interface ProductImageInput {
    url: string;
    altText?: string | null;
    mediaId?: string | null;
    position?: number;
}

export interface Product {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    shortDescription: string | null;
    type: ProductType;
    status: ProductStatus;
    visibility: ProductVisibility;
    featured: boolean;
    brandId: string | null;
    brand: ProductBrand | null;
    categories: ProductCategoryRef[];
    variants: ProductVariant[];
    images: ProductImage[];
    price: number | null;
    sku: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ProductListFilters {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: ProductStatus | '';
    brandId?: string;
    categoryId?: string;
    type?: ProductType | '';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface ProductPrimaryImageInput {
    url: string;
    altText?: string | null;
    mediaId?: string | null;
}

export interface CreateProductRequest {
    name: string;
    slug: string;
    description?: string | null;
    shortDescription?: string | null;
    type?: ProductType;
    status?: ProductStatus;
    visibility?: ProductVisibility;
    brandId?: string | null;
    categoryIds?: string[];
    featured?: boolean;
    metaTitle?: string | null;
    metaDescription?: string | null;
    price?: number;
    compareAtPrice?: number | null;
    sku?: string;
    trackInventory?: boolean;
    initialStock?: number;
    primaryImage?: ProductPrimaryImageInput | null;
    images?: ProductImageInput[];
}

export interface UpdateProductRequest {
    name?: string;
    slug?: string;
    description?: string | null;
    shortDescription?: string | null;
    type?: ProductType;
    status?: ProductStatus;
    visibility?: ProductVisibility;
    brandId?: string | null;
    categoryIds?: string[];
    featured?: boolean;
    metaTitle?: string | null;
    metaDescription?: string | null;
    price?: number;
    compareAtPrice?: number | null;
    sku?: string;
    trackInventory?: boolean;
    primaryImage?: ProductPrimaryImageInput | null;
}

export interface CreateVariantRequest {
    sku: string;
    title?: string | null;
    barcode?: string | null;
    price: number;
    compareAtPrice?: number | null;
    status?: ProductStatus;
    trackInventory?: boolean;
}

export interface UpdateVariantRequest {
    sku?: string;
    title?: string | null;
    barcode?: string | null;
    price?: number;
    compareAtPrice?: number | null;
    status?: ProductStatus;
    trackInventory?: boolean;
}

export interface ApiProductBrandPayload {
    id: string;
    name: string;
    slug: string;
}

export interface ApiProductCategoryPayload {
    id: string;
    name: string;
    slug: string;
}

export interface ApiProductVariantPayload {
    id: string;
    sku?: string;
    title?: string | null;
    price?: number | string;
    compare_at_price?: number | string | null;
    compareAtPrice?: number | string | null;
    status?: string;
    barcode?: string | null;
    track_inventory?: boolean;
    trackInventory?: boolean;
}

export interface ApiProductImagePayload {
    id: string;
    url: string;
    alt_text?: string | null;
    altText?: string | null;
    position?: number;
    media_id?: string | null;
    mediaId?: string | null;
}

export interface ApiProductPayload {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    short_description?: string | null;
    shortDescription?: string | null;
    type?: string;
    status?: string;
    visibility?: string;
    featured?: boolean;
    brand_id?: string | null;
    brandId?: string | null;
    brand?: ApiProductBrandPayload | null;
    categories?: ApiProductCategoryPayload[];
    variants?: ApiProductVariantPayload[];
    images?: ApiProductImagePayload[];
    price?: number | string | null;
    sku?: string | null;
    meta_title?: string | null;
    metaTitle?: string | null;
    meta_description?: string | null;
    metaDescription?: string | null;
    created_at?: string;
    updated_at?: string;
}

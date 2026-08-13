/**
 * Product API — Observable client for /products
 */

import { inject, Injectable } from '@angular/core';
import { PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import { ApiPaginatedPayload, mapApiPaginated } from '@utils/api-mappers';
import { map, Observable } from 'rxjs';

import { toNumber, resolveMediaUrl } from '../../shared/format.util';
import {
    ApiProductImagePayload,
    ApiProductPayload,
    ApiProductVariantPayload,
    CreateProductRequest,
    CreateVariantRequest,
    Product,
    ProductImage,
    ProductImageInput,
    ProductListFilters,
    ProductStatus,
    ProductType,
    ProductVariant,
    ProductVisibility,
    UpdateProductRequest,
    UpdateVariantRequest,
} from '../models/product.model';

function mapApiVariant(payload: ApiProductVariantPayload): ProductVariant {
    return {
        id: payload.id,
        sku: payload.sku ?? '',
        title: payload.title ?? null,
        price: toNumber(payload.price),
        compareAtPrice:
            payload.compare_at_price != null || payload.compareAtPrice != null
                ? toNumber(payload.compare_at_price ?? payload.compareAtPrice)
                : null,
        status: (payload.status as ProductStatus) ?? 'PUBLISHED',
        barcode: payload.barcode ?? null,
        trackInventory: payload.track_inventory ?? payload.trackInventory ?? true,
    };
}

function mapApiImage(payload: {
    id: string;
    url: string;
    alt_text?: string | null;
    altText?: string | null;
    position?: number;
    media_id?: string | null;
    mediaId?: string | null;
}): ProductImage {
    return {
        id: payload.id,
        url: resolveMediaUrl(payload.url),
        altText: payload.alt_text ?? payload.altText ?? null,
        position: payload.position ?? 0,
        mediaId: payload.media_id ?? payload.mediaId ?? null,
    };
}

function resolveProductPrice(
    payload: ApiProductPayload,
    defaultVariant: ProductVariant | undefined,
): number | null {
    if (payload.price != null) {
        return toNumber(payload.price);
    }
    if (defaultVariant) {
        return defaultVariant.price;
    }
    return null;
}

export function mapApiProduct(payload: ApiProductPayload): Product {
    const variants = (payload.variants ?? []).map(mapApiVariant);
    const defaultVariant = variants[0];

    return {
        id: payload.id,
        name: payload.name,
        slug: payload.slug,
        description: payload.description ?? null,
        shortDescription: payload.short_description ?? payload.shortDescription ?? null,
        type: (payload.type as ProductType) ?? 'SIMPLE',
        status: (payload.status as ProductStatus) ?? 'DRAFT',
        visibility: (payload.visibility as ProductVisibility) ?? 'VISIBLE',
        featured: Boolean(payload.featured),
        brandId: payload.brand_id ?? payload.brandId ?? null,
        brand: payload.brand
            ? { id: payload.brand.id, name: payload.brand.name, slug: payload.brand.slug }
            : null,
        categories: (payload.categories ?? []).map((category) => ({
            id: category.id,
            name: category.name,
            slug: category.slug,
        })),
        variants,
        images: (payload.images ?? []).map(mapApiImage),
        price: resolveProductPrice(payload, defaultVariant),
        sku: payload.sku ?? defaultVariant?.sku ?? null,
        metaTitle: payload.meta_title ?? payload.metaTitle ?? null,
        metaDescription: payload.meta_description ?? payload.metaDescription ?? null,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
    };
}

type ProductBodyPayload = CreateProductRequest | UpdateProductRequest;

function applyProductIdentity(body: Record<string, unknown>, payload: ProductBodyPayload): void {
    if ('name' in payload && payload.name !== undefined) body['name'] = payload.name;
    if ('slug' in payload && payload.slug !== undefined) body['slug'] = payload.slug;
    if ('description' in payload) body['description'] = payload.description ?? null;
    if ('shortDescription' in payload) body['shortDescription'] = payload.shortDescription ?? null;
    if ('type' in payload && payload.type !== undefined) body['type'] = payload.type;
    if ('status' in payload && payload.status !== undefined) body['status'] = payload.status;
    if ('visibility' in payload && payload.visibility !== undefined) {
        body['visibility'] = payload.visibility;
    }
}

function applyProductCatalog(body: Record<string, unknown>, payload: ProductBodyPayload): void {
    if ('brandId' in payload) body['brandId'] = payload.brandId ?? null;
    if ('categoryIds' in payload && payload.categoryIds !== undefined) {
        body['categoryIds'] = payload.categoryIds;
    }
    if ('featured' in payload && payload.featured !== undefined) body['featured'] = payload.featured;
}

function applyProductSeo(body: Record<string, unknown>, payload: ProductBodyPayload): void {
    if ('metaTitle' in payload) body['metaTitle'] = payload.metaTitle ?? null;
    if ('metaDescription' in payload) body['metaDescription'] = payload.metaDescription ?? null;
}

function applyProductPricing(body: Record<string, unknown>, payload: ProductBodyPayload): void {
    if ('price' in payload && payload.price !== undefined) body['price'] = payload.price;
    if ('compareAtPrice' in payload) body['compareAtPrice'] = payload.compareAtPrice ?? null;
    if ('sku' in payload && payload.sku !== undefined) body['sku'] = payload.sku;
    if ('trackInventory' in payload && payload.trackInventory !== undefined) {
        body['trackInventory'] = payload.trackInventory;
    }
    if ('initialStock' in payload && payload.initialStock !== undefined) {
        body['initialStock'] = payload.initialStock;
    }
}

function applyProductImages(body: Record<string, unknown>, payload: ProductBodyPayload): void {
    if ('primaryImage' in payload && payload.primaryImage) {
        body['primaryImage'] = {
            url: payload.primaryImage.url,
            altText: payload.primaryImage.altText ?? undefined,
            mediaId: payload.primaryImage.mediaId ?? undefined,
        };
    }
    if ('images' in payload && payload.images?.length) {
        body['images'] = payload.images.map((image, index) => ({
            url: image.url,
            altText: image.altText ?? undefined,
            mediaId: image.mediaId ?? undefined,
            position: image.position ?? index,
        }));
    }
}

function buildProductBody(payload: ProductBodyPayload): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    applyProductIdentity(body, payload);
    applyProductCatalog(body, payload);
    applyProductSeo(body, payload);
    applyProductPricing(body, payload);
    applyProductImages(body, payload);
    return body;
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
            brand_id: filters.brandId || undefined,
            category_id: filters.categoryId || undefined,
            type: filters.type || undefined,
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
            .post<ApiProductPayload>('/products', buildProductBody(payload))
            .pipe(map((response) => (response.data ? mapApiProduct(response.data) : null)));
    }

    update(id: string, payload: UpdateProductRequest): Observable<Product | null> {
        return this.http
            .patch<ApiProductPayload>(`/products/${id}`, buildProductBody(payload))
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

    duplicate(id: string): Observable<Product | null> {
        return this.http
            .post<ApiProductPayload>(`/products/${id}/duplicate`, {})
            .pipe(map((response) => (response.data ? mapApiProduct(response.data) : null)));
    }

    listVariants(productId: string): Observable<ProductVariant[]> {
        return this.http.get<ApiProductVariantPayload[]>(`/products/${productId}/variants`).pipe(
            map((response) => (response.data ?? []).map(mapApiVariant)),
        );
    }

    createVariant(productId: string, payload: CreateVariantRequest): Observable<ProductVariant | null> {
        return this.http
            .post<ApiProductVariantPayload>(`/products/${productId}/variants`, payload)
            .pipe(map((response) => (response.data ? mapApiVariant(response.data) : null)));
    }

    updateVariant(
        productId: string,
        variantId: string,
        payload: UpdateVariantRequest,
    ): Observable<ProductVariant | null> {
        return this.http
            .patch<ApiProductVariantPayload>(`/products/${productId}/variants/${variantId}`, payload)
            .pipe(map((response) => (response.data ? mapApiVariant(response.data) : null)));
    }

    deleteVariant(productId: string, variantId: string): Observable<void> {
        return this.http
            .delete(`/products/${productId}/variants/${variantId}`)
            .pipe(map(() => undefined));
    }

    listImages(productId: string): Observable<ProductImage[]> {
        return this.http.get<ApiProductImagePayload[]>(`/products/${productId}/images`).pipe(
            map((response) => (response.data ?? []).map(mapApiImage)),
        );
    }

    addImage(productId: string, payload: ProductImageInput): Observable<ProductImage | null> {
        return this.http
            .post<ApiProductImagePayload>(`/products/${productId}/images`, payload)
            .pipe(map((response) => (response.data ? mapApiImage(response.data) : null)));
    }

    updateImage(
        productId: string,
        imageId: string,
        payload: Partial<ProductImageInput>,
    ): Observable<ProductImage | null> {
        return this.http
            .patch<ApiProductImagePayload>(`/products/${productId}/images/${imageId}`, payload)
            .pipe(map((response) => (response.data ? mapApiImage(response.data) : null)));
    }

    deleteImage(productId: string, imageId: string): Observable<void> {
        return this.http
            .delete(`/products/${productId}/images/${imageId}`)
            .pipe(map(() => undefined));
    }

    reorderImages(productId: string, imageIds: string[]): Observable<ProductImage[]> {
        return this.http
            .post<ApiProductImagePayload[]>(`/products/${productId}/images/reorder`, {
                imageIds,
            })
            .pipe(map((response) => (response.data ?? []).map(mapApiImage)));
    }
}

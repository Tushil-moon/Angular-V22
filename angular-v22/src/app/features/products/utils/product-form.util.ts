/**
 * Product form validation and API error mapping.
 */

import { slugify } from '@features/shared/admin-list.util';

import { getProductTypeProfile } from './product-type.util';

export const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ProductFormField =
    | 'name'
    | 'slug'
    | 'description'
    | 'shortDescription'
    | 'price'
    | 'compareAtPrice'
    | 'sku'
    | 'initialStock'
    | 'metaTitle'
    | 'metaDescription'
    | 'categoryIds'
    | 'images';

export interface ProductFormValues {
    name: string;
    slug: string;
    description: string;
    shortDescription: string;
    type: string;
    status: string;
    visibility: string;
    featured: boolean;
    brandId: string;
    categoryIds: string[];
    price: string;
    compareAtPrice: string;
    sku: string;
    trackInventory: boolean;
    initialStock: string;
    metaTitle: string;
    metaDescription: string;
}

export interface ProductFormValidationContext {
    isEdit: boolean;
    imageCount: number;
}

export function defaultProductFormValues(): ProductFormValues {
    return {
        name: '',
        slug: '',
        description: '',
        shortDescription: '',
        type: 'SIMPLE',
        status: 'DRAFT',
        visibility: 'VISIBLE',
        featured: false,
        brandId: '',
        categoryIds: [],
        price: '',
        compareAtPrice: '',
        sku: '',
        trackInventory: true,
        initialStock: '0',
        metaTitle: '',
        metaDescription: '',
    };
}

export function deriveSlugFromName(name: string): string {
    return slugify(name);
}

export function parseOptionalNumber(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export function validateProductForm(
    values: ProductFormValues,
    context: ProductFormValidationContext,
): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    const profile = getProductTypeProfile(values.type);

    if (!values.name.trim()) {
        errors['name'] = ['Name is required'];
    }

    const slug = values.slug.trim();
    if (!slug) {
        errors['slug'] = ['Slug is required'];
    } else if (!PRODUCT_SLUG_PATTERN.test(slug)) {
        errors['slug'] = ['Slug must use lowercase letters, numbers, and hyphens only'];
    }

    if (values.status === 'PUBLISHED' && values.categoryIds.length === 0) {
        errors['categoryIds'] = ['Select at least one category before publishing'];
    }

    if (values.status === 'PUBLISHED' && context.imageCount === 0) {
        errors['images'] = ['Add at least one product image before publishing'];
    }

    if (profile.showPricing && profile.requiresSku) {
        const price = parseOptionalNumber(values.price);
        if (price === undefined || price < 0) {
            errors['price'] = ['Price is required and must be zero or greater'];
        }

        if (!values.sku.trim()) {
            errors['sku'] = ['SKU is required'];
        }
    }

    if (!context.isEdit && profile.showInventory) {
        const stock = parseOptionalNumber(values.initialStock);
        if (stock !== undefined && stock < 0) {
            errors['initialStock'] = ['Initial stock cannot be negative'];
        }
    }

    const compareAt = parseOptionalNumber(values.compareAtPrice);
    const price = parseOptionalNumber(values.price);
    if (compareAt !== undefined && price !== undefined && compareAt < price) {
        errors['compareAtPrice'] = ['Compare-at price must be greater than or equal to price'];
    }

    return errors;
}

interface ZodLikeIssue {
    path?: (string | number)[];
    message?: string;
}

export function mapApiValidationErrors(error: unknown): Record<string, string[]> {
    if (!error || typeof error !== 'object') return {};

    const code = (error as { code?: string }).code;
    const message =
        typeof (error as { message?: unknown }).message === 'string'
            ? (error as { message: string }).message
            : 'Invalid value';

    if (code === 'CATEGORIES_REQUIRED' || code === 'INVALID_CATEGORIES') {
        return { categoryIds: [message] };
    }
    if (code === 'IMAGE_LIMIT_REACHED' || code === 'IMAGES_REQUIRED') {
        return { images: [message] };
    }

    const details = (error as { details?: unknown }).details;
    if (Array.isArray(details)) {
        const mapped: Record<string, string[]> = {};
        for (const issue of details as ZodLikeIssue[]) {
            const key = String(issue.path?.[0] ?? 'form');
            const message = issue.message ?? 'Invalid value';
            mapped[key] = [...(mapped[key] ?? []), message];
        }
        return mapped;
    }

    if (details && typeof details === 'object' && !Array.isArray(details)) {
        return details as Record<string, string[]>;
    }

    return {};
}

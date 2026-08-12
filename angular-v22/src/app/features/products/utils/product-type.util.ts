import type { ProductType } from '../models/product.model';

export interface ProductTypeProfile {
    label: string;
    description: string;
    showPricing: boolean;
    showVariants: boolean;
    showInventory: boolean;
    defaultTrackInventory: boolean;
    requiresSku: boolean;
}

export const PRODUCT_TYPE_PROFILES: Record<ProductType, ProductTypeProfile> = {
    SIMPLE: {
        label: 'Simple',
        description: 'Single SKU with one price — best for most catalog items.',
        showPricing: true,
        showVariants: false,
        showInventory: true,
        defaultTrackInventory: true,
        requiresSku: true,
    },
    VARIABLE: {
        label: 'Variable',
        description: 'Multiple variants (size, color, etc.) each with its own SKU and price.',
        showPricing: false,
        showVariants: true,
        showInventory: true,
        defaultTrackInventory: true,
        requiresSku: false,
    },
    DIGITAL: {
        label: 'Digital',
        description: 'Downloadable or license-based product — inventory is not tracked.',
        showPricing: true,
        showVariants: false,
        showInventory: false,
        defaultTrackInventory: false,
        requiresSku: true,
    },
    PHYSICAL: {
        label: 'Physical',
        description: 'Shippable goods with stock tracking and fulfillment.',
        showPricing: true,
        showVariants: false,
        showInventory: true,
        defaultTrackInventory: true,
        requiresSku: true,
    },
    SUBSCRIPTION: {
        label: 'Subscription',
        description: 'Recurring billing product — inventory is not tracked.',
        showPricing: true,
        showVariants: false,
        showInventory: false,
        defaultTrackInventory: false,
        requiresSku: true,
    },
    BUNDLE: {
        label: 'Bundle',
        description: 'Grouped offering sold as a single SKU.',
        showPricing: true,
        showVariants: false,
        showInventory: true,
        defaultTrackInventory: true,
        requiresSku: true,
    },
};

export function getProductTypeProfile(type: string): ProductTypeProfile {
    return PRODUCT_TYPE_PROFILES[(type as ProductType) ?? 'SIMPLE'] ?? PRODUCT_TYPE_PROFILES.SIMPLE;
}

export function productTypeOptions(): { value: ProductType; label: string; description: string }[] {
    return (Object.keys(PRODUCT_TYPE_PROFILES) as ProductType[]).map((type) => ({
        value: type,
        label: PRODUCT_TYPE_PROFILES[type].label,
        description: PRODUCT_TYPE_PROFILES[type].description,
    }));
}

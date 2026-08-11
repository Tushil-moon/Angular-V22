export interface InventoryItem {
    id: string;
    warehouseId: string;
    warehouseName: string;
    warehouseCode: string;
    variantId: string;
    sku: string;
    variantTitle: string;
    productName: string;
    onHand: number;
    reserved: number;
    available: number;
    reorderPoint: number | null;
    updatedAt: string;
}

export interface InventoryListFilters {
    page?: number;
    pageSize?: number;
    search?: string;
    warehouseId?: string;
}

export interface AdjustInventoryRequest {
    warehouseId: string;
    variantId: string;
    quantityDelta: number;
    note?: string;
}

export interface ApiInventoryItemPayload {
    id: string;
    warehouse_id: string;
    variant_id: string;
    quantity_on_hand?: number;
    quantity_reserved?: number;
    quantity_available?: number;
    reorder_point?: number | null;
    created_at?: string;
    updated_at?: string;
    warehouse?: { id: string; name: string; code: string } | null;
    variant?: {
        id: string;
        sku: string;
        title?: string | null;
        product?: { id: string; name: string; slug: string } | null;
    } | null;
}

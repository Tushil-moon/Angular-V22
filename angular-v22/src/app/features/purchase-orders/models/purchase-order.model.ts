export type PurchaseOrderStatus =
    | 'DRAFT'
    | 'ORDERED'
    | 'PARTIALLY_RECEIVED'
    | 'RECEIVED'
    | 'CANCELLED';

export interface PurchaseOrder {
    id: string;
    poNumber: string;
    warehouseId: string;
    supplierId: string;
    status: PurchaseOrderStatus;
    currencyCode: string;
    subtotal: number;
    taxTotal: number;
    shippingTotal: number;
    grandTotal: number;
    orderedAt: string | null;
    expectedAt: string | null;
    receivedAt: string | null;
    note: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePurchaseOrderRequest {
    warehouseId: string;
    supplierId: string;
    poNumber: string;
    status?: PurchaseOrderStatus;
    currencyCode?: string;
    note?: string | null;
}

export type UpdatePurchaseOrderRequest = Partial<CreatePurchaseOrderRequest>;

export interface ApiPurchaseOrderPayload {
    id: string;
    po_number: string;
    warehouse_id: string;
    supplier_id: string;
    status?: string;
    currency_code?: string;
    subtotal?: number | string;
    tax_total?: number | string;
    shipping_total?: number | string;
    grand_total?: number | string;
    ordered_at?: string | null;
    expected_at?: string | null;
    received_at?: string | null;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
}

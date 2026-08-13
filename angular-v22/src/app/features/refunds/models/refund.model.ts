export type RefundStatus = 'REQUESTED' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

export interface RefundItem {
    id: string;
    orderItemId: string;
    quantity: number;
    amount: number;
    restock: boolean;
    productName: string | null;
    sku: string | null;
}

export interface Refund {
    id: string;
    orderId: string;
    orderNumber: string | null;
    paymentId: string | null;
    status: RefundStatus;
    amount: number;
    currencyCode: string;
    reason: string | null;
    note: string | null;
    processedAt: string | null;
    createdAt: string;
    updatedAt: string;
    items: RefundItem[];
}

export interface CreateRefundRequest {
    orderId: string;
    paymentId?: string | null;
    amount: number;
    reason?: string | null;
    note?: string | null;
}

export interface UpdateRefundRequest {
    status: RefundStatus;
    note?: string | null;
}

export interface RefundListFilters {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: RefundStatus;
    orderId?: string;
}

export interface ApiRefundPayload {
    id: string;
    order_id?: string;
    payment_id?: string | null;
    status?: string;
    amount?: string | number;
    currency_code?: string;
    reason?: string | null;
    note?: string | null;
    processed_at?: string | null;
    created_at?: string;
    updated_at?: string;
    order?: {
        id?: string;
        order_number?: string;
        customer_email?: string | null;
        grand_total?: string | number;
        amount_refunded?: string | number;
        currency_code?: string;
    };
    payment?: {
        id?: string;
        status?: string;
        amount?: string | number;
        provider_reference?: string | null;
    };
    items?: ApiRefundItemPayload[];
}

export interface ApiRefundItemPayload {
    id: string;
    order_item_id?: string;
    quantity?: number;
    amount?: string | number;
    restock?: boolean;
    order_item?: {
        product_name?: string;
        sku?: string | null;
    };
}

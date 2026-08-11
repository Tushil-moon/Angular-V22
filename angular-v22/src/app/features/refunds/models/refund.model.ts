export type RefundStatus = 'REQUESTED' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

export interface Refund {
    id: string;
    orderId: string;
    orderNumber: string | null;
    status: RefundStatus;
    amount: number;
    currencyCode: string;
    reason: string | null;
    note: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ApiRefundPayload {
    id: string;
    order_id?: string;
    status?: string;
    amount?: string | number;
    currency_code?: string;
    reason?: string | null;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
    order?: { id?: string; order_number?: string };
}

export type PaymentStatus =
    | 'PENDING'
    | 'AUTHORIZED'
    | 'CAPTURED'
    | 'FAILED'
    | 'CANCELLED'
    | 'REFUNDED'
    | 'PARTIALLY_REFUNDED';

export interface Payment {
    id: string;
    orderId: string | null;
    orderNumber: string | null;
    orderEmail: string | null;
    providerId: string | null;
    status: PaymentStatus;
    amount: number;
    currencyCode: string;
    providerReference: string | null;
    authorizedAt: string | null;
    capturedAt: string | null;
    failedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ApiPaymentPayload {
    id: string;
    order_id?: string | null;
    provider_id?: string | null;
    status?: string;
    amount?: number | string;
    currency_code?: string;
    provider_reference?: string | null;
    authorized_at?: string | null;
    captured_at?: string | null;
    failed_at?: string | null;
    created_at?: string;
    updated_at?: string;
    order?: {
        id: string;
        order_number?: string | null;
        customer_email?: string | null;
        status?: string;
    } | null;
}

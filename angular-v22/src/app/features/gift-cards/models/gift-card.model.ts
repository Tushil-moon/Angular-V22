export type GiftCardStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'DEPLETED';

export interface GiftCard {
    id: string;
    code: string;
    initialBalance: number;
    balance: number;
    currencyCode: string;
    status: GiftCardStatus;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateGiftCardRequest {
    code: string;
    initialBalance: number;
    balance?: number;
    currencyCode?: string;
    status?: GiftCardStatus;
}

export interface ApiGiftCardPayload {
    id: string;
    code: string;
    initial_balance?: string | number;
    balance?: string | number;
    currency_code?: string;
    status?: string;
    expires_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

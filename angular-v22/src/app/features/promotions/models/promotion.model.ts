export type PromotionType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING' | 'BUY_X_GET_Y';

export interface Promotion {
    id: string;
    name: string;
    code: string | null;
    type: PromotionType;
    value: number;
    startsAt: string | null;
    endsAt: string | null;
    usageLimit: number | null;
    usageCount: number;
    minSubtotal: number | null;
    stackable: boolean;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PromotionListFilters {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: PromotionType | '';
    enabled?: boolean;
}

export interface CreatePromotionRequest {
    name: string;
    code?: string;
    type: PromotionType;
    value: number;
    enabled?: boolean;
}

export interface ApiPromotionPayload {
    id: string;
    name: string;
    code?: string | null;
    type?: string;
    value?: number | string;
    starts_at?: string | null;
    ends_at?: string | null;
    usage_limit?: number | null;
    usage_count?: number;
    min_subtotal?: number | string | null;
    stackable?: boolean;
    enabled?: boolean;
    created_at?: string;
    updated_at?: string;
}

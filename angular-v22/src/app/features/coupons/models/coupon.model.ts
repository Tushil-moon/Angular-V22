export type CouponStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export interface Coupon {
    id: string;
    code: string;
    promotionId: string | null;
    status: CouponStatus;
    usageLimit: number | null;
    usageCount: number;
    perCustomerLimit: number | null;
    startsAt: string | null;
    endsAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CouponListFilters {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: CouponStatus | '';
}

export interface CreateCouponRequest {
    code: string;
    status?: CouponStatus;
}

export interface ApiCouponPayload {
    id: string;
    code: string;
    promotion_id?: string | null;
    status?: string;
    usage_limit?: number | null;
    usage_count?: number;
    per_customer_limit?: number | null;
    starts_at?: string | null;
    ends_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

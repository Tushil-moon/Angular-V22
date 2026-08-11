export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';

export interface Review {
    id: string;
    productId: string | null;
    productName: string | null;
    rating: number;
    title: string | null;
    body: string | null;
    status: ReviewStatus;
    isVerifiedPurchase: boolean;
    adminReply: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ReviewListFilters {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: ReviewStatus | '';
}

export interface ApiReviewPayload {
    id: string;
    product_id?: string | null;
    rating?: number;
    title?: string | null;
    body?: string | null;
    status?: string;
    is_verified_purchase?: boolean;
    admin_reply?: string | null;
    created_at?: string;
    updated_at?: string;
    product?: { id: string; name?: string | null; slug?: string | null } | null;
}

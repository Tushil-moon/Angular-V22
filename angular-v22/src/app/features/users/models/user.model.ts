export interface AdminUser {
    id: string;
    email: string;
    status: string;
    emailVerified: boolean;
    createdAt: string;
}

export interface ApiAdminUserPayload {
    id: string;
    email?: string | null;
    status?: string;
    email_verified?: boolean;
    created_at?: string;
}

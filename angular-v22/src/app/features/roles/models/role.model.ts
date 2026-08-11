export interface AdminRole {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
}

export interface ApiAdminRolePayload {
    id: string;
    name: string;
    description?: string | null;
    is_active?: boolean;
    created_at?: string;
}

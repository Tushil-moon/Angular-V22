export interface AuditLogEntry {
    id: string;
    action: string;
    actorEmail: string | null;
    ipAddress: string | null;
    createdAt: string;
}

export interface ApiAuditLogPayload {
    id: string;
    action?: string;
    ip_address?: string | null;
    created_at?: string;
    user?: { email?: string | null };
}

export interface NotificationItem {
    id: string;
    title: string;
    body: string | null;
    readAt: string | null;
    createdAt: string;
}

export interface ApiNotificationPayload {
    id: string;
    title?: string;
    body?: string | null;
    read_at?: string | null;
    created_at?: string;
}

export interface MediaAsset {
    id: string;
    fileName: string;
    originalName: string | null;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    url: string;
    storageKey: string;
    altText: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateMediaRequest {
    url: string;
    storageKey: string;
    mimeType: string;
    size: number;
    fileName: string;
    originalName?: string | null;
    altText?: string | null;
}

export interface ApiMediaPayload {
    id: string;
    filename: string;
    original_name?: string | null;
    mime_type: string;
    size_bytes: number;
    width?: number | null;
    height?: number | null;
    url: string;
    storage_key: string;
    alt_text?: string | null;
    created_at?: string;
    updated_at?: string;
}

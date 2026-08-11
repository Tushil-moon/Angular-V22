export type CmsPageStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface CmsPage {
    id: string;
    title: string;
    slug: string;
    status: CmsPageStatus;
    createdAt: string;
    updatedAt: string;
}

export interface CmsBanner {
    id: string;
    title: string;
    subtitle: string | null;
    enabled: boolean;
    position: string | null;
    sortOrder: number;
    createdAt: string;
}

export interface CmsMenu {
    id: string;
    name: string;
    handle: string;
    createdAt: string;
    updatedAt: string;
}

export interface ApiCmsPagePayload {
    id: string;
    title: string;
    slug: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ApiCmsBannerPayload {
    id: string;
    title: string;
    subtitle?: string | null;
    enabled?: boolean;
    position?: string | null;
    sort_order?: number;
    created_at?: string;
}

export interface ApiCmsMenuPayload {
    id: string;
    name: string;
    handle: string;
    created_at?: string;
    updated_at?: string;
}

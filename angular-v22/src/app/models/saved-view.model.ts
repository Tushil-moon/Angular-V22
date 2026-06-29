/**
 * Saved view models — persisted list filters per entity
 */

export type SavedViewEntityType = 'CONTACTS' | 'DEALS' | 'COMPANIES' | 'ACTIVITIES';

export interface SavedViewFilters {
    search?: string;
    stage?: string;
    closeDateFrom?: string;
    closeDateTo?: string;
    status?: string;
}

export interface SavedView {
    id: string;
    userId: string;
    entityType: SavedViewEntityType;
    name: string;
    filters: SavedViewFilters;
    sort?: Record<string, unknown> | null;
    columns?: string[] | null;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

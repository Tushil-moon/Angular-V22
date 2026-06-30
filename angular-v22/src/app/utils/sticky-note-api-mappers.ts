import type { PaginatedResponse } from '@models/index';
import type { StickyNote } from '@models/sticky-note.model';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import { mapApiPaginated } from '@utils/api-mappers';

export function mapApiStickyNote(raw: Record<string, unknown>): StickyNote {
    return {
        id: String(raw['id']),
        userId: String(raw['user_id'] ?? raw['userId']),
        title: (raw['title'] as string | null | undefined) ?? null,
        content: String(raw['content'] ?? ''),
        color: String(raw['color'] ?? '#fef08a'),
        isPinned: Boolean(raw['is_pinned'] ?? raw['isPinned']),
        sortOrder: Number(raw['sort_order'] ?? raw['sortOrder'] ?? 0),
        createdAt: raw['created_at'] ? String(raw['created_at']) : undefined,
        updatedAt: raw['updated_at'] ? String(raw['updated_at']) : undefined,
    };
}

export function mapStickyNotePaginated(
    payload: ApiPaginatedPayload<Record<string, unknown>> | undefined,
    mapper: (item: Record<string, unknown>) => StickyNote,
): PaginatedResponse<StickyNote> {
    if (!payload) {
        return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0, hasMore: false };
    }
    return mapApiPaginated(payload, mapper);
}

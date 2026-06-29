import { inject, Injectable } from '@angular/core';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { StickyNote } from '@models/sticky-note.model';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import { mapApiStickyNote, mapStickyNotePaginated } from '@utils/sticky-note-api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class StickyNoteService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<StickyNote>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/sticky-notes',
            { params: { pageSize: 100, ...filters } },
        );
        return mapStickyNotePaginated(response.data, mapApiStickyNote);
    }

    async getById(id: string): Promise<StickyNote | null> {
        const response = await this.httpClient.get<Record<string, unknown>>(`/sticky-notes/${id}`);
        return response.data ? mapApiStickyNote(response.data) : null;
    }

    async create(payload: Record<string, unknown>): Promise<StickyNote | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/sticky-notes', payload);
        return response.data ? mapApiStickyNote(response.data) : null;
    }

    async update(id: string, payload: Record<string, unknown>): Promise<StickyNote | null> {
        const response = await this.httpClient.patch<Record<string, unknown>>(
            `/sticky-notes/${id}`,
            payload,
        );
        return response.data ? mapApiStickyNote(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/sticky-notes/${id}`);
    }
}

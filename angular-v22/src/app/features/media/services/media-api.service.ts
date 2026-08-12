/**
 * Media API — Observable client for /media
 */

import { inject, Injectable } from '@angular/core';
import { buildListParams } from '@features/shared/admin-list.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import { type ApiPaginatedPayload, mapApiPaginated } from '@utils/api-mappers';
import { map, Observable } from 'rxjs';

import { ApiMediaPayload, CreateMediaRequest, MediaAsset } from '../models/media.model';

export function mapApiMediaAsset(payload: ApiMediaPayload): MediaAsset {
    return {
        id: payload.id,
        fileName: payload.filename,
        originalName: payload.original_name ?? null,
        mimeType: payload.mime_type,
        sizeBytes: payload.size_bytes ?? 0,
        width: payload.width ?? null,
        height: payload.height ?? null,
        url: payload.url,
        storageKey: payload.storage_key,
        altText: payload.alt_text ?? null,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
    };
}

@Injectable({
    providedIn: 'root',
})
export class MediaApiService {
    private readonly http = inject(HttpClientService);

    list(filters: FilterOptions = {}): Observable<PaginatedResponse<MediaAsset>> {
        return this.http
            .get<ApiPaginatedPayload<ApiMediaPayload>>('/media', {
                params: buildListParams(filters),
            })
            .pipe(map((response) => mapApiPaginated(response.data, mapApiMediaAsset)));
    }

    getById(id: string): Observable<MediaAsset | null> {
        return this.http
            .get<ApiMediaPayload>(`/media/${id}`)
            .pipe(map((response) => (response.data ? mapApiMediaAsset(response.data) : null)));
    }

    create(payload: CreateMediaRequest): Observable<MediaAsset | null> {
        return this.http
            .post<ApiMediaPayload>('/media', {
                url: payload.url,
                storageKey: payload.storageKey,
                mimeType: payload.mimeType,
                size: payload.size,
                fileName: payload.fileName,
                originalName: payload.originalName ?? undefined,
                altText: payload.altText ?? undefined,
            })
            .pipe(map((response) => (response.data ? mapApiMediaAsset(response.data) : null)));
    }

    upload(file: File, altText?: string | null): Observable<MediaAsset | null> {
        const formData = new FormData();
        formData.append('file', file);
        if (altText?.trim()) {
            formData.append('altText', altText.trim());
        }

        return this.http
            .post<ApiMediaPayload>('/media/upload', formData)
            .pipe(map((response) => (response.data ? mapApiMediaAsset(response.data) : null)));
    }

    delete(id: string): Observable<void> {
        return this.http.delete(`/media/${id}`).pipe(map(() => undefined));
    }
}

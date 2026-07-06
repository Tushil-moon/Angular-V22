import { inject, Injectable } from '@angular/core';
import type { CaseHistoryEntry, CaseRecord } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import {
    mapApiCase,
    mapApiCaseHistoryEntry,
    mapEnterprisePaginated,
} from '@utils/enterprise-api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class CaseService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<CaseRecord>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/cases',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiCase);
    }

    async getById(id: string): Promise<CaseRecord | null> {
        const response = await this.httpClient.get<Record<string, unknown>>(`/cases/${id}`);
        return response.data ? mapApiCase(response.data) : null;
    }

    async create(payload: Record<string, unknown>): Promise<CaseRecord | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/cases', payload);
        return response.data ? mapApiCase(response.data) : null;
    }

    async update(id: string, payload: Record<string, unknown>): Promise<CaseRecord | null> {
        const response = await this.httpClient.patch<Record<string, unknown>>(
            `/cases/${id}`,
            payload,
        );
        return response.data ? mapApiCase(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/cases/${id}`);
    }

    async addComment(id: string, body: string, isInternal = false): Promise<CaseRecord | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(
            `/cases/${id}/comments`,
            { body, isInternal },
        );
        return response.data ? mapApiCase(response.data) : null;
    }

    async assign(id: string, assigneeId: string | null): Promise<CaseRecord | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(`/cases/${id}/assign`, {
            assigneeId,
        });
        return response.data ? mapApiCase(response.data) : null;
    }

    async resolve(id: string): Promise<CaseRecord | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(`/cases/${id}/resolve`);
        return response.data ? mapApiCase(response.data) : null;
    }

    async close(id: string): Promise<CaseRecord | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(`/cases/${id}/close`);
        return response.data ? mapApiCase(response.data) : null;
    }

    async reopen(id: string): Promise<CaseRecord | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(`/cases/${id}/reopen`);
        return response.data ? mapApiCase(response.data) : null;
    }

    async listHistory(id: string): Promise<CaseHistoryEntry[]> {
        const response = await this.httpClient.get<Record<string, unknown>[]>(`/cases/${id}/history`);
        return Array.isArray(response.data)
            ? response.data.map((entry) => mapApiCaseHistoryEntry(entry))
            : [];
    }
}

import { inject, Injectable } from '@angular/core';
import type { Campaign, CampaignHistoryEntry } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import {
    mapApiCampaign,
    mapApiCampaignHistoryEntry,
    mapEnterprisePaginated,
} from '@utils/enterprise-api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class CampaignService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<Campaign>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/campaigns',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiCampaign);
    }

    async getById(id: string): Promise<Campaign | null> {
        const response = await this.httpClient.get<Record<string, unknown>>(`/campaigns/${id}`);
        return response.data ? mapApiCampaign(response.data) : null;
    }

    async create(payload: Record<string, unknown>): Promise<Campaign | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/campaigns', payload);
        return response.data ? mapApiCampaign(response.data) : null;
    }

    async update(id: string, payload: Record<string, unknown>): Promise<Campaign | null> {
        const response = await this.httpClient.patch<Record<string, unknown>>(
            `/campaigns/${id}`,
            payload,
        );
        return response.data ? mapApiCampaign(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/campaigns/${id}`);
    }

    async activate(id: string): Promise<Campaign | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(
            `/campaigns/${id}/activate`,
        );
        return response.data ? mapApiCampaign(response.data) : null;
    }

    async complete(id: string): Promise<Campaign | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(
            `/campaigns/${id}/complete`,
        );
        return response.data ? mapApiCampaign(response.data) : null;
    }

    async send(id: string): Promise<Campaign | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(`/campaigns/${id}/send`);
        return response.data ? mapApiCampaign(response.data) : null;
    }

    async addMembers(id: string, contactIds: string[]): Promise<Campaign | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(
            `/campaigns/${id}/members`,
            { contactIds },
        );
        return response.data ? mapApiCampaign(response.data) : null;
    }

    async removeMember(id: string, contactId: string): Promise<Campaign | null> {
        const response = await this.httpClient.delete<Record<string, unknown>>(
            `/campaigns/${id}/members`,
            { contactId },
        );
        return response.data ? mapApiCampaign(response.data) : null;
    }

    async listHistory(id: string): Promise<CampaignHistoryEntry[]> {
        const response = await this.httpClient.get<Record<string, unknown>[]>(
            `/campaigns/${id}/history`,
        );
        return Array.isArray(response.data)
            ? response.data.map((entry) => mapApiCampaignHistoryEntry(entry))
            : [];
    }
}

import { inject, Injectable } from '@angular/core';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { AiFeatureFlag, AiInsight } from '@models/enterprise.model';
import {
    mapApiAiFeatureFlag,
    mapApiAiInsight,
    mapEnterprisePaginated,
} from '@utils/enterprise-api-mappers';
import type { ApiPaginatedPayload } from '@utils/api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class AiService {
    private readonly httpClient = inject(HttpClientService);

    async listFlags(filters?: FilterOptions): Promise<PaginatedResponse<AiFeatureFlag>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/ai/flags',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiAiFeatureFlag);
    }

    async createFlag(payload: Record<string, unknown>): Promise<AiFeatureFlag | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/ai/flags', payload);
        return response.data ? mapApiAiFeatureFlag(response.data) : null;
    }

    async deleteFlag(id: string): Promise<void> {
        await this.httpClient.delete(`/ai/flags/${id}`);
    }

    async listInsights(filters?: FilterOptions): Promise<PaginatedResponse<AiInsight>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/ai/insights',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiAiInsight);
    }

    async createInsight(payload: Record<string, unknown>): Promise<AiInsight | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/ai/insights', payload);
        return response.data ? mapApiAiInsight(response.data) : null;
    }

    async deleteInsight(id: string): Promise<void> {
        await this.httpClient.delete(`/ai/insights/${id}`);
    }
}

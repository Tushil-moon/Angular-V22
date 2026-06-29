import { inject, Injectable } from '@angular/core';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { LeadScoreRule } from '@models/enterprise.model';
import { mapApiLeadScoreRule, mapEnterprisePaginated } from '@utils/enterprise-api-mappers';
import type { ApiPaginatedPayload } from '@utils/api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class LeadScoringService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<LeadScoreRule>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/lead-scoring',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiLeadScoreRule);
    }

    async create(payload: Record<string, unknown>): Promise<LeadScoreRule | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/lead-scoring', payload);
        return response.data ? mapApiLeadScoreRule(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/lead-scoring/${id}`);
    }
}

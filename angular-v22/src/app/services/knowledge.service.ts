import { inject, Injectable } from '@angular/core';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { KnowledgeArticle } from '@models/enterprise.model';
import { mapApiKnowledgeArticle, mapEnterprisePaginated } from '@utils/enterprise-api-mappers';
import type { ApiPaginatedPayload } from '@utils/api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class KnowledgeService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<KnowledgeArticle>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/knowledge',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiKnowledgeArticle);
    }

    async create(payload: Record<string, unknown>): Promise<KnowledgeArticle | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/knowledge', payload);
        return response.data ? mapApiKnowledgeArticle(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/knowledge/${id}`);
    }
}

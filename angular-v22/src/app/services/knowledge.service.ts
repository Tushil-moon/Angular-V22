import { inject, Injectable } from '@angular/core';
import type { KnowledgeArticle } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import { mapApiKnowledgeArticle, mapEnterprisePaginated } from '@utils/enterprise-api-mappers';

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

    async getById(id: string): Promise<KnowledgeArticle | null> {
        const response = await this.httpClient.get<Record<string, unknown>>(`/knowledge/${id}`);
        return response.data ? mapApiKnowledgeArticle(response.data) : null;
    }

    async create(payload: Record<string, unknown>): Promise<KnowledgeArticle | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/knowledge', payload);
        return response.data ? mapApiKnowledgeArticle(response.data) : null;
    }

    async update(id: string, payload: Record<string, unknown>): Promise<KnowledgeArticle | null> {
        const response = await this.httpClient.patch<Record<string, unknown>>(
            `/knowledge/${id}`,
            payload,
        );
        return response.data ? mapApiKnowledgeArticle(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/knowledge/${id}`);
    }

    async publish(id: string): Promise<KnowledgeArticle | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(
            `/knowledge/${id}/publish`,
        );
        return response.data ? mapApiKnowledgeArticle(response.data) : null;
    }

    async unpublish(id: string): Promise<KnowledgeArticle | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(
            `/knowledge/${id}/unpublish`,
        );
        return response.data ? mapApiKnowledgeArticle(response.data) : null;
    }
}

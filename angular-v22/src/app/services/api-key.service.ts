import { inject, Injectable } from '@angular/core';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiKey } from '@models/enterprise.model';
import { mapApiApiKey, mapEnterprisePaginated } from '@utils/enterprise-api-mappers';
import type { ApiPaginatedPayload } from '@utils/api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class ApiKeyService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<ApiKey>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/api-keys',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiApiKey);
    }

    async create(payload: Record<string, unknown>): Promise<ApiKey | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/api-keys', payload);
        return response.data ? mapApiApiKey(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/api-keys/${id}`);
    }
}

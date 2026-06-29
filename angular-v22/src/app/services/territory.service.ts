import { inject, Injectable } from '@angular/core';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { Territory } from '@models/enterprise.model';
import { mapApiTerritory, mapEnterprisePaginated } from '@utils/enterprise-api-mappers';
import type { ApiPaginatedPayload } from '@utils/api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class TerritoryService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<Territory>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/territories',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiTerritory);
    }

    async create(payload: Record<string, unknown>): Promise<Territory | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/territories', payload);
        return response.data ? mapApiTerritory(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/territories/${id}`);
    }
}

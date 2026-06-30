import { inject, Injectable } from '@angular/core';
import type { CaseRecord } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import { mapApiCase, mapEnterprisePaginated } from '@utils/enterprise-api-mappers';

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

    async create(payload: Record<string, unknown>): Promise<CaseRecord | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/cases', payload);
        return response.data ? mapApiCase(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/cases/${id}`);
    }
}

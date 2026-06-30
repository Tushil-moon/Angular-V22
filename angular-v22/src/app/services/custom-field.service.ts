import { inject, Injectable } from '@angular/core';
import type { CustomFieldDefinition } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import { mapApiCustomField, mapEnterprisePaginated } from '@utils/enterprise-api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class CustomFieldService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<CustomFieldDefinition>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/custom-fields',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiCustomField);
    }

    async create(payload: Record<string, unknown>): Promise<CustomFieldDefinition | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/custom-fields', payload);
        return response.data ? mapApiCustomField(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/custom-fields/${id}`);
    }
}

import { inject, Injectable } from '@angular/core';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { Workflow } from '@models/enterprise.model';
import { mapApiWorkflow, mapEnterprisePaginated } from '@utils/enterprise-api-mappers';
import type { ApiPaginatedPayload } from '@utils/api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<Workflow>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/workflows',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiWorkflow);
    }

    async create(payload: Record<string, unknown>): Promise<Workflow | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/workflows', payload);
        return response.data ? mapApiWorkflow(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/workflows/${id}`);
    }
}

import { inject, Injectable } from '@angular/core';
import type { Workflow, WorkflowRun } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import {
    mapApiWorkflow,
    mapApiWorkflowRun,
    mapEnterprisePaginated,
} from '@utils/enterprise-api-mappers';

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

    async getById(id: string): Promise<Workflow | null> {
        const response = await this.httpClient.get<Record<string, unknown>>(`/workflows/${id}`);
        return response.data ? mapApiWorkflow(response.data) : null;
    }

    async create(payload: Record<string, unknown>): Promise<Workflow | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/workflows', payload);
        return response.data ? mapApiWorkflow(response.data) : null;
    }

    async update(id: string, payload: Record<string, unknown>): Promise<Workflow | null> {
        const response = await this.httpClient.patch<Record<string, unknown>>(
            `/workflows/${id}`,
            payload,
        );
        return response.data ? mapApiWorkflow(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/workflows/${id}`);
    }

    async activate(id: string): Promise<Workflow | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(
            `/workflows/${id}/activate`,
        );
        return response.data ? mapApiWorkflow(response.data) : null;
    }

    async deactivate(id: string): Promise<Workflow | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(
            `/workflows/${id}/deactivate`,
        );
        return response.data ? mapApiWorkflow(response.data) : null;
    }

    async listRuns(id: string, filters?: FilterOptions): Promise<PaginatedResponse<WorkflowRun>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            `/workflows/${id}/runs`,
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiWorkflowRun);
    }

    async test(id: string, context?: Record<string, unknown>): Promise<WorkflowRun | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(`/workflows/${id}/test`, {
            context,
        });
        return response.data ? mapApiWorkflowRun(response.data) : null;
    }
}

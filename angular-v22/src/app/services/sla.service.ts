import { inject, Injectable } from '@angular/core';
import type { SlaPolicy, SupportQueue } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import {
    mapApiSlaPolicy,
    mapApiSupportQueue,
    mapEnterprisePaginated,
} from '@utils/enterprise-api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class SlaService {
    private readonly httpClient = inject(HttpClientService);

    async listPolicies(filters?: FilterOptions): Promise<PaginatedResponse<SlaPolicy>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/sla/policies',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiSlaPolicy);
    }

    async createPolicy(payload: Record<string, unknown>): Promise<SlaPolicy | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(
            '/sla/policies',
            payload,
        );
        return response.data ? mapApiSlaPolicy(response.data) : null;
    }

    async deletePolicy(id: string): Promise<void> {
        await this.httpClient.delete(`/sla/policies/${id}`);
    }

    async getPolicy(id: string): Promise<SlaPolicy | null> {
        const response = await this.httpClient.get<Record<string, unknown>>(`/sla/policies/${id}`);
        return response.data ? mapApiSlaPolicy(response.data) : null;
    }

    async updatePolicy(id: string, payload: Record<string, unknown>): Promise<SlaPolicy | null> {
        const response = await this.httpClient.patch<Record<string, unknown>>(
            `/sla/policies/${id}`,
            payload,
        );
        return response.data ? mapApiSlaPolicy(response.data) : null;
    }

    async listQueues(filters?: FilterOptions): Promise<PaginatedResponse<SupportQueue>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/sla/queues',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiSupportQueue);
    }

    async createQueue(payload: Record<string, unknown>): Promise<SupportQueue | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/sla/queues', payload);
        return response.data ? mapApiSupportQueue(response.data) : null;
    }

    async deleteQueue(id: string): Promise<void> {
        await this.httpClient.delete(`/sla/queues/${id}`);
    }

    async getQueue(id: string): Promise<SupportQueue | null> {
        const response = await this.httpClient.get<Record<string, unknown>>(`/sla/queues/${id}`);
        return response.data ? mapApiSupportQueue(response.data) : null;
    }

    async updateQueue(id: string, payload: Record<string, unknown>): Promise<SupportQueue | null> {
        const response = await this.httpClient.patch<Record<string, unknown>>(
            `/sla/queues/${id}`,
            payload,
        );
        return response.data ? mapApiSupportQueue(response.data) : null;
    }
}

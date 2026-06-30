import { inject, Injectable } from '@angular/core';
import type { Webhook } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import { mapApiWebhook, mapEnterprisePaginated } from '@utils/enterprise-api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class WebhookService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<Webhook>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/webhooks',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiWebhook);
    }

    async create(payload: Record<string, unknown>): Promise<Webhook | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/webhooks', payload);
        return response.data ? mapApiWebhook(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/webhooks/${id}`);
    }
}

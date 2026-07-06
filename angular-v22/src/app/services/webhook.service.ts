import { inject, Injectable } from '@angular/core';
import type { Webhook, WebhookDelivery } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import {
    mapApiWebhook,
    mapApiWebhookDelivery,
    mapEnterprisePaginated,
} from '@utils/enterprise-api-mappers';

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

    async getById(id: string): Promise<Webhook | null> {
        const response = await this.httpClient.get<Record<string, unknown>>(`/webhooks/${id}`);
        return response.data ? mapApiWebhook(response.data) : null;
    }

    async create(payload: Record<string, unknown>): Promise<Webhook | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/webhooks', payload);
        return response.data ? mapApiWebhook(response.data) : null;
    }

    async update(id: string, payload: Record<string, unknown>): Promise<Webhook | null> {
        const response = await this.httpClient.patch<Record<string, unknown>>(
            `/webhooks/${id}`,
            payload,
        );
        return response.data ? mapApiWebhook(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/webhooks/${id}`);
    }

    async listDeliveries(
        id: string,
        filters?: FilterOptions,
    ): Promise<PaginatedResponse<WebhookDelivery>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            `/webhooks/${id}/deliveries`,
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiWebhookDelivery);
    }

    async test(id: string): Promise<WebhookDelivery | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(`/webhooks/${id}/test`);
        return response.data ? mapApiWebhookDelivery(response.data) : null;
    }

    async retryDelivery(webhookId: string, deliveryId: string): Promise<WebhookDelivery | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(
            `/webhooks/${webhookId}/deliveries/${deliveryId}/retry`,
        );
        return response.data ? mapApiWebhookDelivery(response.data) : null;
    }
}

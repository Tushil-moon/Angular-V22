import { inject, Injectable } from '@angular/core';
import type { Quote, QuoteHistoryEntry } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import {
    mapApiQuote,
    mapApiQuoteHistoryEntry,
    mapEnterprisePaginated,
} from '@utils/enterprise-api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class QuoteService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<Quote>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/quotes',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiQuote);
    }

    async getById(id: string): Promise<Quote | null> {
        const response = await this.httpClient.get<Record<string, unknown>>(`/quotes/${id}`);
        return response.data ? mapApiQuote(response.data) : null;
    }

    async create(payload: Record<string, unknown>): Promise<Quote | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/quotes', payload);
        return response.data ? mapApiQuote(response.data) : null;
    }

    async update(id: string, payload: Record<string, unknown>): Promise<Quote | null> {
        const response = await this.httpClient.patch<Record<string, unknown>>(
            `/quotes/${id}`,
            payload,
        );
        return response.data ? mapApiQuote(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/quotes/${id}`);
    }

    async send(id: string): Promise<Quote | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(`/quotes/${id}/send`);
        return response.data ? mapApiQuote(response.data) : null;
    }

    async accept(id: string): Promise<Quote | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(
            `/quotes/${id}/accept`,
        );
        return response.data ? mapApiQuote(response.data) : null;
    }

    async reject(id: string): Promise<Quote | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(
            `/quotes/${id}/reject`,
        );
        return response.data ? mapApiQuote(response.data) : null;
    }

    async listHistory(id: string): Promise<QuoteHistoryEntry[]> {
        const response = await this.httpClient.get<Record<string, unknown>[]>(`/quotes/${id}/history`);
        return Array.isArray(response.data)
            ? response.data.map((entry) => mapApiQuoteHistoryEntry(entry))
            : [];
    }
}

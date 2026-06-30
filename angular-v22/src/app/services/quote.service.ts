import { inject, Injectable } from '@angular/core';
import type { Quote } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import { mapApiQuote, mapEnterprisePaginated } from '@utils/enterprise-api-mappers';

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

    async create(payload: Record<string, unknown>): Promise<Quote | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/quotes', payload);
        return response.data ? mapApiQuote(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/quotes/${id}`);
    }
}

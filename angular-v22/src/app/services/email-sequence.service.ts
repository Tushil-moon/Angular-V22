import { inject, Injectable } from '@angular/core';
import type { EmailSequence } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import { mapApiEmailSequence, mapEnterprisePaginated } from '@utils/enterprise-api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class EmailSequenceService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<EmailSequence>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/email/sequences',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiEmailSequence);
    }

    async getById(id: string): Promise<EmailSequence | null> {
        const response = await this.httpClient.get<Record<string, unknown>>(
            `/email/sequences/${id}`,
        );
        return response.data ? mapApiEmailSequence(response.data) : null;
    }

    async create(payload: Record<string, unknown>): Promise<EmailSequence | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(
            '/email/sequences',
            payload,
        );
        return response.data ? mapApiEmailSequence(response.data) : null;
    }

    async update(id: string, payload: Record<string, unknown>): Promise<EmailSequence | null> {
        const response = await this.httpClient.patch<Record<string, unknown>>(
            `/email/sequences/${id}`,
            payload,
        );
        return response.data ? mapApiEmailSequence(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/email/sequences/${id}`);
    }
}

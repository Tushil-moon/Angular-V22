import { inject, Injectable } from '@angular/core';
import type { EmailTemplate } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import { mapApiEmailTemplate, mapEnterprisePaginated } from '@utils/enterprise-api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class EmailTemplateService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<EmailTemplate>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/email/templates',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiEmailTemplate);
    }

    async getById(id: string): Promise<EmailTemplate | null> {
        const response = await this.httpClient.get<Record<string, unknown>>(
            `/email/templates/${id}`,
        );
        return response.data ? mapApiEmailTemplate(response.data) : null;
    }

    async create(payload: Record<string, unknown>): Promise<EmailTemplate | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(
            '/email/templates',
            payload,
        );
        return response.data ? mapApiEmailTemplate(response.data) : null;
    }

    async update(id: string, payload: Record<string, unknown>): Promise<EmailTemplate | null> {
        const response = await this.httpClient.patch<Record<string, unknown>>(
            `/email/templates/${id}`,
            payload,
        );
        return response.data ? mapApiEmailTemplate(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/email/templates/${id}`);
    }
}

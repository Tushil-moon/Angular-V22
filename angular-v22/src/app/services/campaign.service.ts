import { inject, Injectable } from '@angular/core';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { Campaign } from '@models/enterprise.model';
import { mapApiCampaign, mapEnterprisePaginated } from '@utils/enterprise-api-mappers';
import type { ApiPaginatedPayload } from '@utils/api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class CampaignService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<Campaign>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/campaigns',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiCampaign);
    }

    async create(payload: Record<string, unknown>): Promise<Campaign | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/campaigns', payload);
        return response.data ? mapApiCampaign(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/campaigns/${id}`);
    }
}

import { inject, Injectable } from '@angular/core';
import type { ForecastPeriod } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import { mapApiForecast, mapEnterprisePaginated } from '@utils/enterprise-api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class ForecastService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<ForecastPeriod>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/forecasting',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiForecast);
    }

    async create(payload: Record<string, unknown>): Promise<ForecastPeriod | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/forecasting', payload);
        return response.data ? mapApiForecast(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/forecasting/${id}`);
    }
}

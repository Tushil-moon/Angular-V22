/**
 * Deal Service
 */

import { inject, Injectable } from '@angular/core';
import {
    Deal,
    DealBoardColumn,
    FilterOptions,
    PaginatedResponse,
    PipelineStageSummary,
} from '@models/index';
import {
    ApiDealPayload,
    ApiPaginatedPayload,
    mapApiDeal,
    mapApiPaginated,
} from '@utils/api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({
    providedIn: 'root',
})
export class DealService {
    private readonly httpClient = inject(HttpClientService);

    async listDeals(filters?: FilterOptions): Promise<PaginatedResponse<Deal>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<ApiDealPayload>>('/deals', {
            params: filters,
        });

        if (!response.data) {
            return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false };
        }

        return mapApiPaginated(response.data, mapApiDeal);
    }

    async getPipeline(): Promise<PipelineStageSummary[]> {
        const response = await this.httpClient.get<PipelineStageSummary[]>('/deals/pipeline');
        return response.data ?? [];
    }

    async getBoard(): Promise<DealBoardColumn[]> {
        const response =
            await this.httpClient.get<{ stage: string; deals: ApiDealPayload[] }[]>('/deals/board');
        return (
            response.data?.map((column) => ({
                stage: column.stage as Deal['stage'],
                deals: column.deals.map(mapApiDeal),
            })) ?? []
        );
    }

    async getDealById(id: string): Promise<Deal | null> {
        const response = await this.httpClient.get<ApiDealPayload>(`/deals/${id}`);
        return response.data ? mapApiDeal(response.data) : null;
    }

    async createDeal(payload: Record<string, unknown>): Promise<Deal | null> {
        const response = await this.httpClient.post<ApiDealPayload>('/deals', payload);
        return response.data ? mapApiDeal(response.data) : null;
    }

    async updateDeal(id: string, payload: Record<string, unknown>): Promise<Deal | null> {
        const response = await this.httpClient.patch<ApiDealPayload>(`/deals/${id}`, payload);
        return response.data ? mapApiDeal(response.data) : null;
    }

    async deleteDeal(id: string): Promise<boolean> {
        await this.httpClient.delete(`/deals/${id}`);
        return true;
    }
}

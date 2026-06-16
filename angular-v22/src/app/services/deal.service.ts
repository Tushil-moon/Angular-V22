/**
 * Deal Service
 */

import { Injectable, inject } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { Deal, PaginatedResponse, PipelineStageSummary, FilterOptions } from '@models/index';
import { mapApiDeal, ApiDealPayload } from '@utils/api-mappers';

@Injectable({
  providedIn: 'root',
})
export class DealService {
  private readonly httpClient = inject(HttpClientService);

  async listDeals(filters?: FilterOptions): Promise<PaginatedResponse<Deal>> {
    const response = await this.httpClient.get<PaginatedResponse<ApiDealPayload>>('/deals', {
      params: filters,
    });

    const payload = response.data ?? { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false };
    return {
      ...payload,
      data: payload.data.map(mapApiDeal),
    };
  }

  async getPipeline(): Promise<PipelineStageSummary[]> {
    const response = await this.httpClient.get<PipelineStageSummary[]>('/deals/pipeline');
    return response.data ?? [];
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

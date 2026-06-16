/**
 * Activity Service
 */

import { Injectable, inject } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { Activity, PaginatedResponse, FilterOptions } from '@models/index';
import { mapApiActivity, ApiActivityPayload } from '@utils/api-mappers';

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  private readonly httpClient = inject(HttpClientService);

  async listActivities(filters?: FilterOptions): Promise<PaginatedResponse<Activity>> {
    const response = await this.httpClient.get<PaginatedResponse<ApiActivityPayload>>('/activities', {
      params: filters,
    });

    const payload = response.data ?? { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false };
    return {
      ...payload,
      data: payload.data.map(mapApiActivity),
    };
  }

  async createActivity(payload: Record<string, unknown>): Promise<Activity | null> {
    const response = await this.httpClient.post<ApiActivityPayload>('/activities', payload);
    return response.data ? mapApiActivity(response.data) : null;
  }
}

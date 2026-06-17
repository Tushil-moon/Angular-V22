/**
 * Activity Service
 */

import { Injectable, inject } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { Activity, PaginatedResponse, FilterOptions } from '@models/index';
import {
  mapApiActivity,
  mapApiPaginated,
  ApiActivityPayload,
  ApiPaginatedPayload,
} from '@utils/api-mappers';

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  private readonly httpClient = inject(HttpClientService);

  async listActivities(filters?: FilterOptions): Promise<PaginatedResponse<Activity>> {
    const response = await this.httpClient.get<ApiPaginatedPayload<ApiActivityPayload>>('/activities', {
      params: filters,
    });

    if (!response.data) {
      return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false };
    }

    return mapApiPaginated(response.data, mapApiActivity);
  }

  async createActivity(payload: Record<string, unknown>): Promise<Activity | null> {
    const response = await this.httpClient.post<ApiActivityPayload>('/activities', payload);
    return response.data ? mapApiActivity(response.data) : null;
  }

  async updateActivity(id: string, payload: Record<string, unknown>): Promise<Activity | null> {
    const response = await this.httpClient.patch<ApiActivityPayload>(`/activities/${id}`, payload);
    return response.data ? mapApiActivity(response.data) : null;
  }

  async deleteActivity(id: string): Promise<boolean> {
    await this.httpClient.delete(`/activities/${id}`);
    return true;
  }
}

import { inject, Injectable } from '@angular/core';
import type { CalendarEvent } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import { mapApiCalendarEvent, mapEnterprisePaginated } from '@utils/enterprise-api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class CalendarService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<CalendarEvent>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/calendar',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiCalendarEvent);
    }

    async create(payload: Record<string, unknown>): Promise<CalendarEvent | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/calendar', payload);
        return response.data ? mapApiCalendarEvent(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/calendar/${id}`);
    }
}

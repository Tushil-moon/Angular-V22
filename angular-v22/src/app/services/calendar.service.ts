import { inject, Injectable } from '@angular/core';
import type {
    CalendarAvailabilityRule,
    CalendarEvent,
    CalendarHistoryEntry,
} from '@models/enterprise.model';
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

    async listInRange(filters: {
        start: string;
        end: string;
        userId?: string;
        type?: string;
        status?: string;
        includeCancelled?: boolean;
    }): Promise<CalendarEvent[]> {
        const response = await this.httpClient.get<Record<string, unknown>[]>('/calendar/range', {
            params: filters,
        });
        return response.data?.map(mapApiCalendarEvent) ?? [];
    }

    async getById(id: string): Promise<CalendarEvent | null> {
        const response = await this.httpClient.get<Record<string, unknown>>(`/calendar/${id}`);
        return response.data ? mapApiCalendarEvent(response.data) : null;
    }

    async getHistory(id: string): Promise<CalendarHistoryEntry[]> {
        const response = await this.httpClient.get<
            {
                id: string;
                action: string;
                details: Record<string, unknown>;
                created_at?: string;
                user?: { id: string; email: string | null } | null;
            }[]
        >(`/calendar/${id}/history`);

        return (
            response.data?.map((entry) => ({
                id: entry.id,
                action: entry.action,
                details: entry.details ?? {},
                createdAt: entry.created_at ?? new Date().toISOString(),
                user: entry.user ?? null,
            })) ?? []
        );
    }

    async getAvailability(userId?: string): Promise<CalendarAvailabilityRule[]> {
        const response = await this.httpClient.get<
            {
                id: string;
                user_id: string;
                day_of_week: number;
                start_minutes: number;
                end_minutes: number;
                timezone: string;
                is_active: boolean;
            }[]
        >('/calendar/availability', { params: userId ? { userId } : undefined });

        return (
            response.data?.map((rule) => ({
                id: rule.id,
                userId: rule.user_id,
                dayOfWeek: rule.day_of_week,
                startMinutes: rule.start_minutes,
                endMinutes: rule.end_minutes,
                timezone: rule.timezone,
                isActive: rule.is_active,
            })) ?? []
        );
    }

    async create(payload: Record<string, unknown>): Promise<CalendarEvent | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/calendar', payload);
        return response.data ? mapApiCalendarEvent(response.data) : null;
    }

    async update(id: string, payload: Record<string, unknown>): Promise<CalendarEvent | null> {
        const response = await this.httpClient.patch<Record<string, unknown>>(
            `/calendar/${id}`,
            payload,
        );
        return response.data ? mapApiCalendarEvent(response.data) : null;
    }

    async cancel(id: string): Promise<CalendarEvent | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(
            `/calendar/${id}/cancel`,
            {},
        );
        return response.data ? mapApiCalendarEvent(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/calendar/${id}`);
    }

    async exportIcs(filters: { start: string; end: string; userId?: string }): Promise<string> {
        return this.httpClient.getText('/calendar/export/ics', { params: filters });
    }
}

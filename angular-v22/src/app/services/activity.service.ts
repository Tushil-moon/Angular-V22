/**
 * Activity Service
 */

import { inject, Injectable } from '@angular/core';
import {
    Activity,
    ActivityHistoryEntry,
    ActivityImportResult,
    FilterOptions,
    PaginatedResponse,
} from '@models/index';
import {
    ApiActivityPayload,
    ApiPaginatedPayload,
    mapApiActivity,
    mapApiPaginated,
} from '@utils/api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({
    providedIn: 'root',
})
export class ActivityService {
    private readonly httpClient = inject(HttpClientService);

    async listActivities(filters?: FilterOptions): Promise<PaginatedResponse<Activity>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<ApiActivityPayload>>(
            '/activities',
            { params: filters },
        );

        if (!response.data) {
            return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false };
        }

        return mapApiPaginated(response.data, mapApiActivity);
    }

    async getTimeline(filters: {
        contactId?: string;
        dealId?: string;
        companyId?: string;
        leadId?: string;
        limit?: number;
    }): Promise<Activity[]> {
        const response = await this.httpClient.get<ApiActivityPayload[]>('/activities/timeline', {
            params: filters,
        });
        return response.data?.map(mapApiActivity) ?? [];
    }

    async getActivityById(id: string): Promise<Activity | null> {
        const response = await this.httpClient.get<ApiActivityPayload>(`/activities/${id}`);
        return response.data ? mapApiActivity(response.data) : null;
    }

    async getActivityHistory(id: string): Promise<ActivityHistoryEntry[]> {
        const response = await this.httpClient.get<
            {
                id: string;
                action: string;
                details: Record<string, unknown>;
                created_at?: string;
                user?: { id: string; email: string | null } | null;
            }[]
        >(`/activities/${id}/history`);

        return (
            response.data?.map((entry) => ({
                id: entry.id,
                action: entry.action as ActivityHistoryEntry['action'],
                details: entry.details ?? {},
                createdAt: entry.created_at ? new Date(entry.created_at) : new Date(),
                user: entry.user ?? null,
            })) ?? []
        );
    }

    async createActivity(payload: Record<string, unknown>): Promise<Activity | null> {
        const response = await this.httpClient.post<ApiActivityPayload>('/activities', payload);
        return response.data ? mapApiActivity(response.data) : null;
    }

    async updateActivity(id: string, payload: Record<string, unknown>): Promise<Activity | null> {
        const response = await this.httpClient.patch<ApiActivityPayload>(
            `/activities/${id}`,
            payload,
        );
        return response.data ? mapApiActivity(response.data) : null;
    }

    async completeActivity(id: string): Promise<{ activity: Activity; nextOccurrence: Activity | null } | null> {
        const response = await this.httpClient.post<{
            activity: ApiActivityPayload;
            next_occurrence?: ApiActivityPayload | null;
        }>(`/activities/${id}/complete`, {});

        if (!response.data?.activity) return null;

        return {
            activity: mapApiActivity(response.data.activity),
            nextOccurrence: response.data.next_occurrence
                ? mapApiActivity(response.data.next_occurrence)
                : null,
        };
    }

    async reopenActivity(id: string): Promise<Activity | null> {
        const response = await this.httpClient.post<ApiActivityPayload>(`/activities/${id}/reopen`, {});
        return response.data ? mapApiActivity(response.data) : null;
    }

    async cancelActivity(id: string): Promise<Activity | null> {
        const response = await this.httpClient.post<ApiActivityPayload>(`/activities/${id}/cancel`, {});
        return response.data ? mapApiActivity(response.data) : null;
    }

    async deleteActivity(id: string): Promise<boolean> {
        await this.httpClient.delete(`/activities/${id}`);
        return true;
    }

    async exportActivities(filters?: FilterOptions): Promise<string> {
        return this.httpClient.getText('/activities/export', { params: filters });
    }

    async importActivitiesCsv(csv: string): Promise<ActivityImportResult> {
        const response = await this.httpClient.post<ActivityImportResult>('/activities/import/csv', {
            csv,
        });
        if (!response.data) {
            return { createdCount: 0, failedCount: 0, created: [], failed: [] };
        }

        return {
            ...response.data,
            created: response.data.created.map((activity) =>
                mapApiActivity(activity as unknown as ApiActivityPayload),
            ),
        };
    }
}

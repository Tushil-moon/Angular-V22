import { inject, Injectable } from '@angular/core';
import { Deal, DealBoardColumn, DealHistoryEntry, DealImportResult, FilterOptions, PaginatedResponse } from '@models/index';
import {
    ApiDealPayload,
    ApiPaginatedPayload,
    mapApiDeal,
    mapApiPaginated,
} from '@utils/api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
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

    async getBoard(): Promise<DealBoardColumn[]> {
        const response = await this.httpClient.get<{
            columns: {
                stage_id: string;
                stage_key: string;
                name: string;
                probability: number;
                stage: string;
                deals: ApiDealPayload[];
            }[];
        }>('/deals/board');

        return (
            response.data?.columns.map((column) => ({
                stageId: column.stage_id,
                stageKey: column.stage_key as Deal['stage'],
                name: column.name,
                probability: column.probability,
                stage: column.stage as Deal['stage'],
                deals: column.deals.map(mapApiDeal),
            })) ?? []
        );
    }

    async getDealById(id: string): Promise<Deal | null> {
        const response = await this.httpClient.get<ApiDealPayload>(`/deals/${id}`);
        return response.data ? mapApiDeal(response.data) : null;
    }

    async getDealHistory(id: string): Promise<DealHistoryEntry[]> {
        const response = await this.httpClient.get<
            {
                id: string;
                action: string;
                details: Record<string, unknown>;
                created_at?: string;
                user?: { id: string; email: string | null } | null;
            }[]
        >(`/deals/${id}/history`);

        return (
            response.data?.map((entry) => ({
                id: entry.id,
                action: entry.action as DealHistoryEntry['action'],
                details: entry.details ?? {},
                createdAt: entry.created_at ? new Date(entry.created_at) : new Date(),
                user: entry.user ?? null,
            })) ?? []
        );
    }

    async createDeal(payload: Record<string, unknown>): Promise<Deal | null> {
        const response = await this.httpClient.post<ApiDealPayload>('/deals', payload);
        return response.data ? mapApiDeal(response.data) : null;
    }

    async updateDeal(id: string, payload: Record<string, unknown>): Promise<Deal | null> {
        const response = await this.httpClient.patch<ApiDealPayload>(`/deals/${id}`, payload);
        return response.data ? mapApiDeal(response.data) : null;
    }

    async winDeal(id: string, winReason?: string): Promise<Deal | null> {
        const response = await this.httpClient.post<ApiDealPayload>(`/deals/${id}/win`, { winReason });
        return response.data ? mapApiDeal(response.data) : null;
    }

    async loseDeal(id: string, lossReason: string, competitor?: string): Promise<Deal | null> {
        const response = await this.httpClient.post<ApiDealPayload>(`/deals/${id}/lose`, {
            lossReason,
            competitor,
        });
        return response.data ? mapApiDeal(response.data) : null;
    }

    async reopenDeal(id: string, stage?: Deal['stage']): Promise<Deal | null> {
        const response = await this.httpClient.post<ApiDealPayload>(`/deals/${id}/reopen`, { stage });
        return response.data ? mapApiDeal(response.data) : null;
    }

    async deleteDeal(id: string): Promise<boolean> {
        await this.httpClient.delete(`/deals/${id}`);
        return true;
    }

    async importDealsCsv(csv: string, skipMissingContacts = true): Promise<DealImportResult> {
        const response = await this.httpClient.post<DealImportResult>('/deals/import/csv', {
            csv,
            skipMissingContacts,
        });
        if (!response.data) {
            return {
                createdCount: 0,
                skippedCount: 0,
                failedCount: 0,
                created: [],
                skipped: [],
                failed: [],
            };
        }

        return {
            ...response.data,
            created: response.data.created.map((deal) =>
                mapApiDeal(deal as unknown as ApiDealPayload),
            ),
        };
    }

    async exportDeals(filters?: FilterOptions): Promise<string> {
        return this.httpClient.getText('/deals/export', { params: filters });
    }
}

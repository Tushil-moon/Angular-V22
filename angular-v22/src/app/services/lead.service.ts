import { inject, Injectable } from '@angular/core';
import {
    Contact,
    Deal,
    FilterOptions,
    Lead,
    LeadHistoryEntry,
    LeadImportResult,
    PaginatedResponse,
} from '@models/index';
import {
    ApiContactPayload,
    ApiDealPayload,
    ApiLeadPayload,
    ApiPaginatedPayload,
    mapApiContact,
    mapApiDeal,
    mapApiLead,
    mapApiLeadHistory,
    mapApiPaginated,
} from '@utils/api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class LeadService {
    private readonly httpClient = inject(HttpClientService);

    async listLeads(filters?: FilterOptions): Promise<PaginatedResponse<Lead>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<ApiLeadPayload>>('/leads', {
            params: filters,
        });
        if (!response.data) {
            return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false };
        }
        return mapApiPaginated(response.data, mapApiLead);
    }

    async getLeadById(id: string): Promise<Lead | null> {
        const response = await this.httpClient.get<ApiLeadPayload>(`/leads/${id}`);
        return response.data ? mapApiLead(response.data) : null;
    }

    async getLeadHistory(id: string): Promise<LeadHistoryEntry[]> {
        const response = await this.httpClient.get<
            {
                id: string;
                action: string;
                details: Record<string, unknown>;
                created_at?: string;
                user?: { id: string; email: string | null } | null;
            }[]
        >(`/leads/${id}/history`);
        return response.data?.map(mapApiLeadHistory) ?? [];
    }

    async createLead(payload: Record<string, unknown>): Promise<Lead | null> {
        const response = await this.httpClient.post<ApiLeadPayload>('/leads', payload);
        return response.data ? mapApiLead(response.data) : null;
    }

    async updateLead(id: string, payload: Record<string, unknown>): Promise<Lead | null> {
        const response = await this.httpClient.patch<ApiLeadPayload>(`/leads/${id}`, payload);
        return response.data ? mapApiLead(response.data) : null;
    }

    async qualifyLead(id: string, qualificationNotes?: string): Promise<Lead | null> {
        const response = await this.httpClient.post<ApiLeadPayload>(`/leads/${id}/qualify`, {
            qualificationNotes,
        });
        return response.data ? mapApiLead(response.data) : null;
    }

    async disqualifyLead(id: string, lostReason: string): Promise<Lead | null> {
        const response = await this.httpClient.post<ApiLeadPayload>(`/leads/${id}/disqualify`, {
            lostReason,
        });
        return response.data ? mapApiLead(response.data) : null;
    }

    async assignLead(id: string, ownerId: string): Promise<Lead | null> {
        const response = await this.httpClient.post<ApiLeadPayload>(`/leads/${id}/assign`, {
            ownerId,
        });
        return response.data ? mapApiLead(response.data) : null;
    }

    async scoreLead(id: string): Promise<Lead | null> {
        const response = await this.httpClient.post<ApiLeadPayload>(`/leads/${id}/score`, {});
        return response.data ? mapApiLead(response.data) : null;
    }

    async convertLead(
        id: string,
        payload: { status?: 'PROSPECT' | 'CUSTOMER'; deal?: { title: string; value: number } },
    ): Promise<{ lead: Lead; contact: Contact; deal: Deal | null } | null> {
        const response = await this.httpClient.post<{
            lead: ApiLeadPayload;
            contact: ApiContactPayload;
            deal: ApiDealPayload | null;
        }>(`/leads/${id}/convert`, payload);
        if (!response.data) return null;
        return {
            lead: mapApiLead(response.data.lead),
            contact: mapApiContact(response.data.contact),
            deal: response.data.deal ? mapApiDeal(response.data.deal) : null,
        };
    }

    async deleteLead(id: string): Promise<boolean> {
        await this.httpClient.delete(`/leads/${id}`);
        return true;
    }

    async importLeadsCsv(csv: string, skipDuplicates = true): Promise<LeadImportResult> {
        const response = await this.httpClient.post<LeadImportResult>('/leads/import/csv', {
            csv,
            skipDuplicates,
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
            created: response.data.created.map((lead) =>
                mapApiLead(lead as unknown as ApiLeadPayload),
            ),
        };
    }

    async exportLeads(filters?: FilterOptions): Promise<string> {
        return this.httpClient.getText('/leads/export', { params: filters });
    }
}

/**
 * Contact Service
 */

import { inject, Injectable } from '@angular/core';
import {
    Contact,
    ContactDuplicateMatch,
    ContactImportResult,
    Deal,
    FilterOptions,
    PaginatedResponse,
} from '@models/index';
import {
    ApiContactPayload,
    ApiDealPayload,
    ApiPaginatedPayload,
    mapApiContact,
    mapApiDeal,
    mapApiPaginated,
} from '@utils/api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({
    providedIn: 'root',
})
export class ContactService {
    private readonly httpClient = inject(HttpClientService);

    async listContacts(filters?: FilterOptions): Promise<PaginatedResponse<Contact>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<ApiContactPayload>>(
            '/contacts',
            {
                params: filters,
            },
        );

        if (!response.data) {
            return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false };
        }

        return mapApiPaginated(response.data, mapApiContact);
    }

    async getContactById(id: string): Promise<Contact | null> {
        const response = await this.httpClient.get<ApiContactPayload>(`/contacts/${id}`);
        return response.data ? mapApiContact(response.data) : null;
    }

    async createContact(payload: Record<string, unknown>): Promise<Contact | null> {
        const response = await this.httpClient.post<ApiContactPayload>('/contacts', payload);
        return response.data ? mapApiContact(response.data) : null;
    }

    async updateContact(id: string, payload: Record<string, unknown>): Promise<Contact | null> {
        const response = await this.httpClient.patch<ApiContactPayload>(`/contacts/${id}`, payload);
        return response.data ? mapApiContact(response.data) : null;
    }

    async deleteContact(id: string): Promise<boolean> {
        await this.httpClient.delete(`/contacts/${id}`);
        return true;
    }

    async convertLead(
        id: string,
        payload: { status?: 'PROSPECT' | 'CUSTOMER'; deal?: { title: string; value: number } },
    ): Promise<{ contact: Contact; deal: Deal | null } | null> {
        const response = await this.httpClient.post<{
            contact: ApiContactPayload;
            deal: ApiDealPayload | null;
        }>(`/contacts/${id}/convert`, payload);
        if (!response.data) return null;
        return {
            contact: mapApiContact(response.data.contact),
            deal: response.data.deal ? mapApiDeal(response.data.deal) : null,
        };
    }

    async checkDuplicates(payload: Record<string, unknown>): Promise<ContactDuplicateMatch[]> {
        const response = await this.httpClient.post<
            {
                contact_id: string;
                score: number;
                reasons: ContactDuplicateMatch['reasons'];
                contact: ApiContactPayload | null;
            }[]
        >('/contacts/check-duplicates', payload);

        return (
            response.data?.map((match) => ({
                contactId: match.contact_id,
                score: match.score,
                reasons: match.reasons,
                contact: match.contact ? mapApiContact(match.contact) : null,
            })) ?? []
        );
    }

    async getDuplicates(id: string): Promise<ContactDuplicateMatch[]> {
        const response = await this.httpClient.get<
            {
                contact_id: string;
                score: number;
                reasons: ContactDuplicateMatch['reasons'];
                contact: ApiContactPayload | null;
            }[]
        >(`/contacts/${id}/duplicates`);

        return (
            response.data?.map((match) => ({
                contactId: match.contact_id,
                score: match.score,
                reasons: match.reasons,
                contact: match.contact ? mapApiContact(match.contact) : null,
            })) ?? []
        );
    }

    async mergeContacts(id: string, sourceContactIds: string[]): Promise<Contact | null> {
        const response = await this.httpClient.post<ApiContactPayload>(`/contacts/${id}/merge`, {
            sourceContactIds,
        });
        return response.data ? mapApiContact(response.data) : null;
    }

    async importContactsCsv(csv: string, skipDuplicates = true): Promise<ContactImportResult> {
        const response = await this.httpClient.post<ContactImportResult>('/contacts/import/csv', {
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
            created: response.data.created.map((contact) =>
                mapApiContact(contact as unknown as ApiContactPayload),
            ),
        };
    }

    async exportContacts(filters?: FilterOptions): Promise<string> {
        const response = await this.httpClient.getText('/contacts/export', { params: filters });
        return response;
    }
}

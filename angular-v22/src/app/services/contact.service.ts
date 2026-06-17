/**
 * Contact Service
 */

import { Injectable, inject } from '@angular/core';
import { HttpClientService } from './http-client.service';
import {
  mapApiContact,
  mapApiDeal,
  mapApiPaginated,
  ApiContactPayload,
  ApiDealPayload,
  ApiPaginatedPayload,
} from '@utils/api-mappers';
import { Contact, Deal, PaginatedResponse, FilterOptions } from '@models/index';

@Injectable({
  providedIn: 'root',
})
export class ContactService {
  private readonly httpClient = inject(HttpClientService);

  async listContacts(filters?: FilterOptions): Promise<PaginatedResponse<Contact>> {
    const response = await this.httpClient.get<ApiPaginatedPayload<ApiContactPayload>>('/contacts', {
      params: filters,
    });

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
}

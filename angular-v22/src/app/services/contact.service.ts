/**
 * Contact Service
 */

import { Injectable, inject } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { Contact, PaginatedResponse, FilterOptions } from '@models/index';
import {
  mapApiContact,
  mapApiPaginated,
  ApiContactPayload,
  ApiPaginatedPayload,
} from '@utils/api-mappers';

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
}

import { Injectable, inject } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { Company, PaginatedResponse, FilterOptions } from '@models/index';
import {
  mapApiCompany,
  mapApiPaginated,
  ApiCompanyPayload,
  ApiPaginatedPayload,
} from '@utils/api-mappers';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly httpClient = inject(HttpClientService);

  async listCompanies(filters?: FilterOptions): Promise<PaginatedResponse<Company>> {
    const response = await this.httpClient.get<ApiPaginatedPayload<ApiCompanyPayload>>('/companies', {
      params: filters,
    });
    if (!response.data) {
      return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false };
    }
    return mapApiPaginated(response.data, mapApiCompany);
  }

  async getCompanyById(id: string): Promise<Company | null> {
    const response = await this.httpClient.get<ApiCompanyPayload>(`/companies/${id}`);
    return response.data ? mapApiCompany(response.data) : null;
  }

  async createCompany(payload: Record<string, unknown>): Promise<Company | null> {
    const response = await this.httpClient.post<ApiCompanyPayload>('/companies', payload);
    return response.data ? mapApiCompany(response.data) : null;
  }

  async updateCompany(id: string, payload: Record<string, unknown>): Promise<Company | null> {
    const response = await this.httpClient.patch<ApiCompanyPayload>(`/companies/${id}`, payload);
    return response.data ? mapApiCompany(response.data) : null;
  }

  async deleteCompany(id: string): Promise<boolean> {
    await this.httpClient.delete(`/companies/${id}`);
    return true;
  }
}

import { inject, Injectable } from '@angular/core';
import type { Product } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import { mapApiProduct, mapEnterprisePaginated } from '@utils/enterprise-api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class ProductService {
    private readonly httpClient = inject(HttpClientService);

    async list(filters?: FilterOptions): Promise<PaginatedResponse<Product>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/products',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiProduct);
    }

    async getById(id: string): Promise<Product | null> {
        const response = await this.httpClient.get<Record<string, unknown>>(`/products/${id}`);
        return response.data ? mapApiProduct(response.data) : null;
    }

    async create(payload: Record<string, unknown>): Promise<Product | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/products', payload);
        return response.data ? mapApiProduct(response.data) : null;
    }

    async update(id: string, payload: Record<string, unknown>): Promise<Product | null> {
        const response = await this.httpClient.patch<Record<string, unknown>>(
            `/products/${id}`,
            payload,
        );
        return response.data ? mapApiProduct(response.data) : null;
    }

    async delete(id: string): Promise<void> {
        await this.httpClient.delete(`/products/${id}`);
    }
}

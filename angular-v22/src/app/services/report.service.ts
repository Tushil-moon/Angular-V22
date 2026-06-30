import { inject, Injectable } from '@angular/core';
import type { DashboardLayout, Report } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import {
    mapApiDashboardLayout,
    mapApiReport,
    mapEnterprisePaginated,
} from '@utils/enterprise-api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class ReportService {
    private readonly httpClient = inject(HttpClientService);

    async listReports(filters?: FilterOptions): Promise<PaginatedResponse<Report>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/reports',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiReport);
    }

    async createReport(payload: Record<string, unknown>): Promise<Report | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/reports', payload);
        return response.data ? mapApiReport(response.data) : null;
    }

    async deleteReport(id: string): Promise<void> {
        await this.httpClient.delete(`/reports/${id}`);
    }

    async listLayouts(filters?: FilterOptions): Promise<PaginatedResponse<DashboardLayout>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/reports/layouts',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiDashboardLayout);
    }

    async createLayout(payload: Record<string, unknown>): Promise<DashboardLayout | null> {
        const response = await this.httpClient.post<Record<string, unknown>>(
            '/reports/layouts',
            payload,
        );
        return response.data ? mapApiDashboardLayout(response.data) : null;
    }

    async deleteLayout(id: string): Promise<void> {
        await this.httpClient.delete(`/reports/layouts/${id}`);
    }
}

import { inject, Injectable } from '@angular/core';
import type { AnalyticsOverview, DashboardLayout, Report, ReportRun } from '@models/enterprise.model';
import { FilterOptions, PaginatedResponse } from '@models/index';
import type { ApiPaginatedPayload } from '@utils/api-mappers';
import {
    mapApiAnalyticsOverview,
    mapApiDashboardLayout,
    mapApiReport,
    mapApiReportRun,
    mapEnterprisePaginated,
} from '@utils/enterprise-api-mappers';

import { HttpClientService } from './http-client.service';

export interface ReportRunResult {
    run: ReportRun;
    result: {
        columns: { key: string; label: string }[];
        rows: Record<string, string | number | null>[];
        summary?: Record<string, number>;
    };
}

@Injectable({ providedIn: 'root' })
export class ReportService {
    private readonly httpClient = inject(HttpClientService);

    async getOverview(): Promise<AnalyticsOverview | null> {
        const response = await this.httpClient.get<Record<string, unknown>>('/reports/overview');
        return response.data ? mapApiAnalyticsOverview(response.data) : null;
    }

    async listReports(filters?: FilterOptions): Promise<PaginatedResponse<Report>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/reports',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiReport);
    }

    async getReport(id: string): Promise<Report | null> {
        const response = await this.httpClient.get<Record<string, unknown>>(`/reports/${id}`);
        return response.data ? mapApiReport(response.data) : null;
    }

    async createReport(payload: Record<string, unknown>): Promise<Report | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/reports', payload);
        return response.data ? mapApiReport(response.data) : null;
    }

    async updateReport(id: string, payload: Record<string, unknown>): Promise<Report | null> {
        const response = await this.httpClient.patch<Record<string, unknown>>(`/reports/${id}`, payload);
        return response.data ? mapApiReport(response.data) : null;
    }

    async deleteReport(id: string): Promise<void> {
        await this.httpClient.delete(`/reports/${id}`);
    }

    async runReport(id: string): Promise<ReportRunResult | null> {
        const response = await this.httpClient.post<{
            run: Record<string, unknown>;
            result: ReportRunResult['result'];
        }>(`/reports/${id}/run`);
        if (!response.data?.run || !response.data.result) return null;
        return {
            run: mapApiReportRun(response.data.run),
            result: response.data.result,
        };
    }

    async exportCsv(id: string): Promise<string> {
        return this.httpClient.getText(`/reports/${id}/export/csv`);
    }

    async listReportRuns(id: string, filters?: FilterOptions): Promise<PaginatedResponse<ReportRun>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            `/reports/${id}/runs`,
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiReportRun);
    }

    async listLayouts(filters?: FilterOptions): Promise<PaginatedResponse<DashboardLayout>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<Record<string, unknown>>>(
            '/reports/layouts',
            { params: filters },
        );
        return mapEnterprisePaginated(response.data, mapApiDashboardLayout);
    }

    async getLayout(id: string): Promise<DashboardLayout | null> {
        const response = await this.httpClient.get<Record<string, unknown>>(`/reports/layouts/${id}`);
        return response.data ? mapApiDashboardLayout(response.data) : null;
    }

    async createLayout(payload: Record<string, unknown>): Promise<DashboardLayout | null> {
        const response = await this.httpClient.post<Record<string, unknown>>('/reports/layouts', payload);
        return response.data ? mapApiDashboardLayout(response.data) : null;
    }

    async updateLayout(id: string, payload: Record<string, unknown>): Promise<DashboardLayout | null> {
        const response = await this.httpClient.patch<Record<string, unknown>>(
            `/reports/layouts/${id}`,
            payload,
        );
        return response.data ? mapApiDashboardLayout(response.data) : null;
    }

    async deleteLayout(id: string): Promise<void> {
        await this.httpClient.delete(`/reports/layouts/${id}`);
    }
}

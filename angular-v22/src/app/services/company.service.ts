import { inject, Injectable } from '@angular/core';
import {
    Company,
    CompanyDuplicateMatch,
    CompanyImportResult,
    CompanyTreeNode,
    FilterOptions,
    PaginatedResponse,
} from '@models/index';
import { ApiCompanyPayload, ApiPaginatedPayload, mapApiCompany, mapApiPaginated } from '@utils/api-mappers';

import { HttpClientService } from './http-client.service';

interface ApiCompanyTreeNode {
    id: string;
    parent_company_id?: string | null;
    name: string;
    domain?: string | null;
    industry?: string | null;
    ownership_percent?: number | null;
    employee_count?: number | null;
    children?: ApiCompanyTreeNode[];
}

const mapCompanyTreeNode = (node: ApiCompanyTreeNode): CompanyTreeNode => ({
    id: node.id,
    parentCompanyId: node.parent_company_id,
    name: node.name,
    domain: node.domain,
    industry: node.industry,
    ownershipPercent: node.ownership_percent,
    employeeCount: node.employee_count,
    children: (node.children ?? []).map(mapCompanyTreeNode),
});

@Injectable({ providedIn: 'root' })
export class CompanyService {
    private readonly httpClient = inject(HttpClientService);

    async listCompanies(filters?: FilterOptions): Promise<PaginatedResponse<Company>> {
        const response = await this.httpClient.get<ApiPaginatedPayload<ApiCompanyPayload>>(
            '/companies',
            { params: filters },
        );
        if (!response.data) {
            return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false };
        }
        return mapApiPaginated(response.data, mapApiCompany);
    }

    async getCompanyTree(): Promise<CompanyTreeNode[]> {
        const response = await this.httpClient.get<ApiCompanyTreeNode[]>('/companies/tree');
        return response.data?.map(mapCompanyTreeNode) ?? [];
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

    async checkDuplicates(payload: Record<string, unknown>): Promise<CompanyDuplicateMatch[]> {
        const response = await this.httpClient.post<
            {
                company_id: string;
                score: number;
                reasons: CompanyDuplicateMatch['reasons'];
                company: ApiCompanyPayload | null;
            }[]
        >('/companies/check-duplicates', payload);

        return (
            response.data?.map((match) => ({
                companyId: match.company_id,
                score: match.score,
                reasons: match.reasons,
                company: match.company ? mapApiCompany(match.company) : null,
            })) ?? []
        );
    }

    async importCompaniesCsv(csv: string, skipDuplicates = true): Promise<CompanyImportResult> {
        const response = await this.httpClient.post<CompanyImportResult>('/companies/import/csv', {
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
            created: response.data.created.map((company) =>
                mapApiCompany(company as unknown as ApiCompanyPayload),
            ),
        };
    }

    async exportCompanies(filters?: FilterOptions): Promise<string> {
        return this.httpClient.getText('/companies/export', { params: filters });
    }
}

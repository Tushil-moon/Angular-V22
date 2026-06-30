import { Component, inject } from '@angular/core';
import type { Report } from '@models/enterprise.model';
import { ReportService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseDate } from '../enterprise/enterprise-list.util';

@Component({
    selector: 'app-reports-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
        />
    `,
})
export class ReportsListComponent {
    private readonly reportService = inject(ReportService);

    readonly config: EnterpriseListConfig<Report> = {
        title: 'Reports',
        description: 'Custom analytics reports',
        entityLabel: 'report',
        columns: [
            { key: 'name', label: 'Name', cell: (r) => r.name },
            { key: 'entityType', label: 'Entity', cell: (r) => r.entityType },
            {
                key: 'createdAt',
                label: 'Created',
                cell: (r) => formatEnterpriseDate(r.createdAt),
                hideBelow: 'md',
            },
        ],
    };

    readonly listFn = (filters: Parameters<ReportService['listReports']>[0]) =>
        this.reportService.listReports(filters);

    readonly createFn = () =>
        this.reportService.createReport({
            name: `Report ${new Date().toLocaleDateString()}`,
            entityType: 'deals',
        });

    readonly deleteFn = (id: string) => this.reportService.deleteReport(id);
}

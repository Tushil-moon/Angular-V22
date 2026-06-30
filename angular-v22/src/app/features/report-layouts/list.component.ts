import { Component, inject } from '@angular/core';
import type { DashboardLayout } from '@models/enterprise.model';
import { ReportService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseDate } from '../enterprise/enterprise-list.util';

@Component({
    selector: 'app-report-layouts-list',
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
export class ReportLayoutsListComponent {
    private readonly reportService = inject(ReportService);

    readonly config: EnterpriseListConfig<DashboardLayout> = {
        title: 'Dashboard layouts',
        description: 'Saved dashboard widget layouts',
        entityLabel: 'layout',
        columns: [
            { key: 'name', label: 'Name', cell: (l) => l.name },
            {
                key: 'createdAt',
                label: 'Created',
                cell: (l) => formatEnterpriseDate(l.createdAt),
                hideBelow: 'md',
            },
        ],
    };

    readonly listFn = (filters: Parameters<ReportService['listLayouts']>[0]) =>
        this.reportService.listLayouts(filters);

    readonly createFn = () =>
        this.reportService.createLayout({
            name: `Layout ${new Date().toLocaleDateString()}`,
            widgets: [],
        });

    readonly deleteFn = (id: string) => this.reportService.deleteLayout(id);
}

import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import type { Report } from '@models/enterprise.model';
import { DialogService, ReportService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseBool, formatEnterpriseDate } from '../enterprise/enterprise-list.util';
import { formatEnterpriseStatus } from '../enterprise/enterprise-ui.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-reports-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            #shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [openDetailFn]="openDetailFn"
            [defaultView]="'cards'"
            listTitle="Saved reports"
        />
    `,
})
export class ReportsListComponent {
    private readonly reportService = inject(ReportService);
    private readonly dialogService = inject(DialogService);
    private readonly shell = viewChild<EnterpriseListShellComponent<Report>>('shell');

    readonly config: EnterpriseListConfig<Report> = {
        title: 'Reports',
        description: 'Custom analytics reports',
        entityLabel: 'report',
        cardTitle: (r) => r.name,
        cardSubtitle: (r) => formatEnterpriseStatus(r.entityType),
        columns: [
            { key: 'name', label: 'Name', cell: (r) => r.name },
            { key: 'entityType', label: 'Entity', cell: (r) => formatEnterpriseStatus(r.entityType) },
            {
                key: 'chartType',
                label: 'Chart',
                cell: (r) => (r.chartType ? formatEnterpriseStatus(r.chartType) : '—'),
                hideBelow: 'md',
            },
            {
                key: 'isShared',
                label: 'Shared',
                cell: (r) => formatEnterpriseBool(r.isShared ?? false),
                hideBelow: 'md',
            },
            {
                key: 'lastRunAt',
                label: 'Last run',
                cell: (r) => formatEnterpriseDate(r.lastRunAt),
                hideBelow: 'lg',
            },
            {
                key: 'createdAt',
                label: 'Created',
                cell: (r) => formatEnterpriseDate(r.createdAt),
                hideBelow: 'lg',
            },
        ],
    };

    readonly listFn = (filters: Parameters<ReportService['listReports']>[0]) =>
        this.reportService.listReports(filters);

    readonly createFn = async () => {
        await this.openReportDialog();
        return null;
    };

    readonly deleteFn = (id: string) => this.reportService.deleteReport(id);

    readonly openDetailFn = (item: Report) => this.openReportDialog(item.id);

    private async openReportDialog(reportId?: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./report-detail-dialog.component').ReportDetailDialogComponent,
            import('./report-detail-dialog.component').ReportDetailDialogData,
            import('./report-detail-dialog.component').ReportDetailDialogResult
        >(
            () =>
                import('./report-detail-dialog.component').then((m) => m.ReportDetailDialogComponent),
            { data: { reportId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.shell()?.reload();
        });
    }
}

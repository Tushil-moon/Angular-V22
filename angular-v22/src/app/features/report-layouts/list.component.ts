import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import type { DashboardLayout } from '@models/enterprise.model';
import { DialogService, ReportService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseBool, formatEnterpriseDate } from '../enterprise/enterprise-list.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-report-layouts-list',
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
            listTitle="Dashboard layouts"
        />
    `,
})
export class ReportLayoutsListComponent {
    private readonly reportService = inject(ReportService);
    private readonly dialogService = inject(DialogService);
    private readonly shell = viewChild<EnterpriseListShellComponent<DashboardLayout>>('shell');

    readonly config: EnterpriseListConfig<DashboardLayout> = {
        title: 'Dashboard layouts',
        description: 'Saved dashboard widget layouts',
        entityLabel: 'layout',
        cardTitle: (l) => l.name,
        cardSubtitle: (l) => `${l.widgets?.length ?? 0} widgets`,
        columns: [
            { key: 'name', label: 'Name', cell: (l) => l.name },
            {
                key: 'isDefault',
                label: 'Default',
                cell: (l) => formatEnterpriseBool(l.isDefault ?? false),
                hideBelow: 'md',
            },
            {
                key: 'isShared',
                label: 'Shared',
                cell: (l) => formatEnterpriseBool(l.isShared ?? false),
                hideBelow: 'md',
            },
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

    readonly createFn = async () => {
        await this.openLayoutDialog();
        return null;
    };

    readonly deleteFn = (id: string) => this.reportService.deleteLayout(id);

    readonly openDetailFn = (item: DashboardLayout) => this.openLayoutDialog(item.id);

    private async openLayoutDialog(layoutId?: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./dashboard-layout-dialog.component').DashboardLayoutDialogComponent,
            import('./dashboard-layout-dialog.component').DashboardLayoutDialogData,
            import('./dashboard-layout-dialog.component').DashboardLayoutDialogResult
        >(
            () =>
                import('./dashboard-layout-dialog.component').then(
                    (m) => m.DashboardLayoutDialogComponent,
                ),
            { data: { layoutId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.shell()?.reload();
        });
    }
}

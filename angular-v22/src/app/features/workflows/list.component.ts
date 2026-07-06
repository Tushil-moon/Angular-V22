import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import type { Workflow } from '@models/enterprise.model';
import { DialogService, WorkflowService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseBool, formatEnterpriseDate } from '../enterprise/enterprise-list.util';
import { formatEnterpriseStatus } from '../enterprise/enterprise-ui.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflows-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            #shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [openDetailFn]="openDetailFn"
        />
    `,
})
export class WorkflowsListComponent {
    private readonly workflowService = inject(WorkflowService);
    private readonly dialogService = inject(DialogService);
    private readonly shell = viewChild<EnterpriseListShellComponent<Workflow>>('shell');

    readonly config: EnterpriseListConfig<Workflow> = {
        title: 'Workflows',
        description: 'Automated CRM workflows',
        entityLabel: 'workflow',
        cardTitle: (w) => w.name,
        cardSubtitle: (w) => formatEnterpriseStatus(w.trigger),
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Active', value: 'true' },
            { label: 'Inactive', value: 'false' },
        ],
        columns: [
            { key: 'name', label: 'Name', cell: (w) => w.name },
            { key: 'trigger', label: 'Trigger', cell: (w) => formatEnterpriseStatus(w.trigger), hideBelow: 'md' },
            { key: 'active', label: 'Active', cell: (w) => formatEnterpriseBool(w.active) },
            {
                key: 'runCount',
                label: 'Runs',
                cell: (w) => String(w.runCount ?? 0),
                hideBelow: 'md',
            },
            {
                key: 'lastRunAt',
                label: 'Last run',
                cell: (w) => formatEnterpriseDate(w.lastRunAt),
                hideBelow: 'lg',
            },
        ],
    };

    readonly listFn = (filters: Parameters<WorkflowService['list']>[0]) => {
        const status = filters?.['status'];
        const active = status === 'true' ? true : status === 'false' ? false : undefined;
        return this.workflowService.list({ ...filters, active, status: undefined });
    };

    readonly createFn = async () => {
        await this.openWorkflowDialog();
        return null;
    };

    readonly deleteFn = (id: string) => this.workflowService.delete(id);

    readonly openDetailFn = (item: Workflow) => this.openWorkflowDialog(item.id);

    private async openWorkflowDialog(workflowId?: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./workflow-detail-dialog.component').WorkflowDetailDialogComponent,
            import('./workflow-detail-dialog.component').WorkflowDetailDialogData,
            import('./workflow-detail-dialog.component').WorkflowDetailDialogResult
        >(
            () =>
                import('./workflow-detail-dialog.component').then(
                    (m) => m.WorkflowDetailDialogComponent,
                ),
            { data: { workflowId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.shell()?.reload();
        });
    }
}

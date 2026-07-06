import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import type { SlaPolicy, SupportQueue } from '@models/enterprise.model';
import { DialogService, SlaService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';
import { ModuleWorkspaceShellComponent } from '@shared/components/module-workspace-shell.component';

import { formatEnterpriseBool } from '../enterprise/enterprise-list.util';
import { formatEnterpriseStatus } from '../enterprise/enterprise-ui.util';
import { SERVICE_NAV } from '../workspaces/service-nav';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-sla-list',
    imports: [ModuleWorkspaceShellComponent, EnterpriseListShellComponent],
    template: `
        <app-module-workspace-shell
            eyebrow="Service Cloud"
            title="SLA & queues"
            description="Response targets and case routing queues"
            [navItems]="navItems"
        >
            <div class="space-y-8">
                <app-enterprise-list-shell
                    #policyShell
                    [embedded]="true"
                    [config]="policyConfig"
                    [listFn]="listPolicies"
                    [createFn]="createPolicy"
                    [deleteFn]="deletePolicy"
                    [openDetailFn]="openPolicyDetail"
                    listTitle="SLA policies"
                />
                <app-enterprise-list-shell
                    #queueShell
                    [embedded]="true"
                    [config]="queueConfig"
                    [listFn]="listQueues"
                    [createFn]="createQueue"
                    [deleteFn]="deleteQueue"
                    [openDetailFn]="openQueueDetail"
                    listTitle="Support queues"
                />
            </div>
        </app-module-workspace-shell>
    `,
})
export class SlaListComponent {
    private readonly slaService = inject(SlaService);
    private readonly dialogService = inject(DialogService);
    private readonly policyShell = viewChild<EnterpriseListShellComponent<SlaPolicy>>('policyShell');
    private readonly queueShell = viewChild<EnterpriseListShellComponent<SupportQueue>>('queueShell');

    readonly navItems = SERVICE_NAV;

    readonly policyConfig: EnterpriseListConfig<SlaPolicy> = {
        title: 'SLA policies',
        description: 'Response and resolution targets by priority',
        entityLabel: 'SLA policy',
        cardTitle: (p) => p.name,
        cardSubtitle: (p) =>
            `${formatEnterpriseStatus(p.priority)} · ${p.firstResponseHours}h / ${p.resolutionHours}h`,
        columns: [
            { key: 'name', label: 'Name', cell: (p) => p.name },
            { key: 'priority', label: 'Priority', cell: (p) => formatEnterpriseStatus(p.priority) },
            {
                key: 'firstResponseHours',
                label: 'First response (h)',
                cell: (p) => String(p.firstResponseHours),
            },
            {
                key: 'resolutionHours',
                label: 'Resolution (h)',
                cell: (p) => String(p.resolutionHours),
            },
            { key: 'active', label: 'Active', cell: (p) => formatEnterpriseBool(p.active) },
        ],
    };

    readonly queueConfig: EnterpriseListConfig<SupportQueue> = {
        title: 'Support queues',
        description: 'Route cases to teams with default SLA policies',
        entityLabel: 'queue',
        cardTitle: (q) => q.name,
        cardSubtitle: (q) => q.slaPolicy?.name ?? 'No SLA policy',
        columns: [
            { key: 'name', label: 'Name', cell: (q) => q.name },
            { key: 'slaPolicy', label: 'SLA policy', cell: (q) => q.slaPolicy?.name ?? '—' },
            { key: 'isDefault', label: 'Default', cell: (q) => formatEnterpriseBool(q.isDefault) },
        ],
    };

    readonly listPolicies = (filters: Parameters<SlaService['listPolicies']>[0]) =>
        this.slaService.listPolicies(filters);

    readonly createPolicy = async () => {
        await this.openPolicyDialog();
        return null;
    };

    readonly deletePolicy = (id: string) => this.slaService.deletePolicy(id);

    readonly openPolicyDetail = (item: SlaPolicy) => this.openPolicyDialog(item.id);

    readonly listQueues = (filters: Parameters<SlaService['listQueues']>[0]) =>
        this.slaService.listQueues(filters);

    readonly createQueue = async () => {
        await this.openQueueDialog();
        return null;
    };

    readonly deleteQueue = (id: string) => this.slaService.deleteQueue(id);

    readonly openQueueDetail = (item: SupportQueue) => this.openQueueDialog(item.id);

    private async openPolicyDialog(policyId?: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./sla-policy-dialog.component').SlaPolicyDialogComponent,
            import('./sla-policy-dialog.component').SlaPolicyDialogData,
            import('./sla-policy-dialog.component').SlaPolicyDialogResult
        >(
            () => import('./sla-policy-dialog.component').then((m) => m.SlaPolicyDialogComponent),
            { data: { policyId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.policyShell()?.reload();
        });
    }

    private async openQueueDialog(queueId?: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./support-queue-dialog.component').SupportQueueDialogComponent,
            import('./support-queue-dialog.component').SupportQueueDialogData,
            import('./support-queue-dialog.component').SupportQueueDialogResult
        >(
            () =>
                import('./support-queue-dialog.component').then(
                    (m) => m.SupportQueueDialogComponent,
                ),
            { data: { queueId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.queueShell()?.reload();
        });
    }
}

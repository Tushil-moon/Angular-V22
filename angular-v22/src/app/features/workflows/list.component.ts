import { Component, inject } from '@angular/core';
import type { Workflow } from '@models/enterprise.model';
import { WorkflowService } from '@services/index';
import {
    EnterpriseListShellComponent,
    type EnterpriseListConfig,
} from '@shared/components/enterprise-list-shell.component';
import { formatEnterpriseBool } from '../enterprise/enterprise-list.util';

@Component({
    selector: 'app-workflows-list',
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
export class WorkflowsListComponent {
    private readonly workflowService = inject(WorkflowService);

    readonly config: EnterpriseListConfig<Workflow> = {
        title: 'Workflows',
        description: 'Automated CRM workflows',
        entityLabel: 'workflow',
        columns: [
            { key: 'name', label: 'Name', cell: (w) => w.name },
            { key: 'trigger', label: 'Trigger', cell: (w) => w.trigger, hideBelow: 'md' },
            { key: 'active', label: 'Active', cell: (w) => formatEnterpriseBool(w.active) },
        ],
    };

    readonly listFn = (filters: Parameters<WorkflowService['list']>[0]) =>
        this.workflowService.list(filters);

    readonly createFn = () =>
        this.workflowService.create({
            name: `Workflow ${new Date().toLocaleDateString()}`,
            trigger: 'deal.created',
            active: true,
        });

    readonly deleteFn = (id: string) => this.workflowService.delete(id);
}

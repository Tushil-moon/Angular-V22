import { Component, inject } from '@angular/core';
import type { LeadScoreRule } from '@models/enterprise.model';
import { LeadScoringService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseBool } from '../enterprise/enterprise-list.util';

@Component({
    selector: 'app-lead-scoring-list',
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
export class LeadScoringListComponent {
    private readonly leadScoringService = inject(LeadScoringService);

    readonly config: EnterpriseListConfig<LeadScoreRule> = {
        title: 'Lead scoring',
        description: 'Rules that score leads automatically',
        entityLabel: 'rule',
        columns: [
            { key: 'name', label: 'Name', cell: (r) => r.name },
            { key: 'field', label: 'Field', cell: (r) => r.field, hideBelow: 'md' },
            { key: 'operator', label: 'Operator', cell: (r) => r.operator, hideBelow: 'lg' },
            { key: 'points', label: 'Points', cell: (r) => String(r.points) },
            { key: 'active', label: 'Active', cell: (r) => formatEnterpriseBool(r.active) },
        ],
    };

    readonly listFn = (filters: Parameters<LeadScoringService['list']>[0]) =>
        this.leadScoringService.list(filters);

    readonly createFn = () =>
        this.leadScoringService.create({
            name: 'New rule',
            field: 'status',
            operator: 'eq',
            value: 'qualified',
            points: 10,
        });

    readonly deleteFn = (id: string) => this.leadScoringService.delete(id);
}

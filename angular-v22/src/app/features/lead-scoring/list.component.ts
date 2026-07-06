import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import type { LeadScoreRule } from '@models/enterprise.model';
import { DialogService, LeadScoringService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseBool } from '../enterprise/enterprise-list.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-lead-scoring-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            #shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [openDetailFn]="openDetailFn"
            listTitle="Scoring rules"
        />
    `,
})
export class LeadScoringListComponent {
    private readonly leadScoringService = inject(LeadScoringService);
    private readonly dialogService = inject(DialogService);
    private readonly shell = viewChild<EnterpriseListShellComponent<LeadScoreRule>>('shell');

    readonly config: EnterpriseListConfig<LeadScoreRule> = {
        title: 'Lead scoring',
        description: 'Rules that score leads automatically',
        entityLabel: 'rule',
        cardTitle: (r) => r.name,
        cardSubtitle: (r) => `${r.field} ${r.operator} ${r.value} · ${r.points} pts`,
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Active', value: 'true' },
            { label: 'Inactive', value: 'false' },
        ],
        columns: [
            { key: 'name', label: 'Name', cell: (r) => r.name },
            { key: 'field', label: 'Field', cell: (r) => r.field, hideBelow: 'md' },
            { key: 'operator', label: 'Operator', cell: (r) => r.operator, hideBelow: 'lg' },
            { key: 'points', label: 'Points', cell: (r) => String(r.points) },
            { key: 'active', label: 'Active', cell: (r) => formatEnterpriseBool(r.active) },
        ],
    };

    readonly listFn = (filters: Parameters<LeadScoringService['list']>[0]) => {
        const status = filters?.['status'];
        const active = status === 'true' ? true : status === 'false' ? false : undefined;
        return this.leadScoringService.list({ ...filters, active, status: undefined });
    };

    readonly createFn = async () => {
        await this.openRuleDialog();
        return null;
    };

    readonly deleteFn = (id: string) => this.leadScoringService.delete(id);

    readonly openDetailFn = (item: LeadScoreRule) => this.openRuleDialog(item.id);

    private async openRuleDialog(ruleId?: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./lead-score-rule-dialog.component').LeadScoreRuleDialogComponent,
            import('./lead-score-rule-dialog.component').LeadScoreRuleDialogData,
            import('./lead-score-rule-dialog.component').LeadScoreRuleDialogResult
        >(
            () =>
                import('./lead-score-rule-dialog.component').then(
                    (m) => m.LeadScoreRuleDialogComponent,
                ),
            { data: { ruleId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.shell()?.reload();
        });
    }
}

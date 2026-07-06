import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import type { EmailSequence } from '@models/enterprise.model';
import { DialogService, EmailSequenceService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseBool, formatEnterpriseDate } from '../enterprise/enterprise-list.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-email-sequences-list',
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
export class EmailSequencesListComponent {
    private readonly emailSequenceService = inject(EmailSequenceService);
    private readonly dialogService = inject(DialogService);
    private readonly shell = viewChild<EnterpriseListShellComponent<EmailSequence>>('shell');

    readonly config: EnterpriseListConfig<EmailSequence> = {
        title: 'Email sequences',
        description: 'Multi-step nurture flows with timed delays',
        entityLabel: 'sequence',
        cardTitle: (s) => s.name,
        cardSubtitle: (s) => `${s.steps?.length ?? 0} steps`,
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Active', value: 'true' },
            { label: 'Inactive', value: 'false' },
        ],
        columns: [
            { key: 'name', label: 'Name', cell: (s) => s.name },
            {
                key: 'steps',
                label: 'Steps',
                cell: (s) => String(s.steps?.length ?? 0),
            },
            { key: 'active', label: 'Active', cell: (s) => formatEnterpriseBool(s.active) },
            {
                key: 'updatedAt',
                label: 'Updated',
                cell: (s) => formatEnterpriseDate(s.updatedAt),
                hideBelow: 'md',
            },
        ],
    };

    readonly listFn = (filters: Parameters<EmailSequenceService['list']>[0]) => {
        const status = filters?.['status'];
        const active = status === 'true' ? true : status === 'false' ? false : undefined;
        return this.emailSequenceService.list({ ...filters, active, status: undefined });
    };

    readonly createFn = async () => {
        await this.openSequenceDialog();
        return null;
    };

    readonly deleteFn = (id: string) => this.emailSequenceService.delete(id);

    readonly openDetailFn = (item: EmailSequence) => this.openSequenceDialog(item.id);

    private async openSequenceDialog(sequenceId?: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./email-sequence-dialog.component').EmailSequenceDialogComponent,
            import('./email-sequence-dialog.component').EmailSequenceDialogData,
            import('./email-sequence-dialog.component').EmailSequenceDialogResult
        >(
            () =>
                import('./email-sequence-dialog.component').then(
                    (m) => m.EmailSequenceDialogComponent,
                ),
            { data: { sequenceId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.shell()?.reload();
        });
    }
}

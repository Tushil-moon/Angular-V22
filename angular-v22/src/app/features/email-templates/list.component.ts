import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import type { EmailTemplate } from '@models/enterprise.model';
import { DialogService, EmailTemplateService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseBool, formatEnterpriseDate } from '../enterprise/enterprise-list.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-email-templates-list',
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
            listTitle="Email templates"
        />
    `,
})
export class EmailTemplatesListComponent {
    private readonly emailTemplateService = inject(EmailTemplateService);
    private readonly dialogService = inject(DialogService);
    private readonly shell = viewChild<EnterpriseListShellComponent<EmailTemplate>>('shell');

    readonly config: EnterpriseListConfig<EmailTemplate> = {
        title: 'Email templates',
        description: 'Reusable content for campaigns and nurture sequences',
        entityLabel: 'template',
        cardTitle: (t) => t.name,
        cardSubtitle: (t) => t.subject,
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Active', value: 'true' },
            { label: 'Inactive', value: 'false' },
        ],
        columns: [
            { key: 'name', label: 'Name', cell: (t) => t.name },
            { key: 'subject', label: 'Subject', cell: (t) => t.subject },
            { key: 'category', label: 'Category', cell: (t) => t.category ?? '—' },
            { key: 'active', label: 'Active', cell: (t) => formatEnterpriseBool(t.active) },
            {
                key: 'updatedAt',
                label: 'Updated',
                cell: (t) => formatEnterpriseDate(t.updatedAt),
                hideBelow: 'md',
            },
        ],
    };

    readonly listFn = (filters: Parameters<EmailTemplateService['list']>[0]) => {
        const status = filters?.['status'];
        const active = status === 'true' ? true : status === 'false' ? false : undefined;
        return this.emailTemplateService.list({ ...filters, active, status: undefined });
    };

    readonly createFn = async () => {
        await this.openTemplateDialog();
        return null;
    };

    readonly deleteFn = (id: string) => this.emailTemplateService.delete(id);

    readonly openDetailFn = (item: EmailTemplate) => this.openTemplateDialog(item.id);

    private async openTemplateDialog(templateId?: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./email-template-dialog.component').EmailTemplateDialogComponent,
            import('./email-template-dialog.component').EmailTemplateDialogData,
            import('./email-template-dialog.component').EmailTemplateDialogResult
        >(
            () =>
                import('./email-template-dialog.component').then(
                    (m) => m.EmailTemplateDialogComponent,
                ),
            { data: { templateId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.shell()?.reload();
        });
    }
}

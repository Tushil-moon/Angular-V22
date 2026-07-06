import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import type { CustomFieldDefinition } from '@models/enterprise.model';
import { CustomFieldService, DialogService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseStatus } from '../enterprise/enterprise-ui.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-custom-fields-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            #shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [openDetailFn]="openDetailFn"
            listTitle="Field definitions"
        />
    `,
})
export class CustomFieldsListComponent {
    private readonly customFieldService = inject(CustomFieldService);
    private readonly dialogService = inject(DialogService);
    private readonly shell = viewChild<EnterpriseListShellComponent<CustomFieldDefinition>>('shell');

    readonly config: EnterpriseListConfig<CustomFieldDefinition> = {
        title: 'Custom fields',
        description: 'Extended field definitions for CRM entities',
        entityLabel: 'field',
        cardTitle: (f) => f.label,
        cardSubtitle: (f) => `${formatEnterpriseStatus(f.entityType)} · ${f.fieldType}`,
        columns: [
            { key: 'label', label: 'Label', cell: (f) => f.label },
            { key: 'key', label: 'Key', cell: (f) => f.key, hideBelow: 'md' },
            { key: 'entityType', label: 'Entity', cell: (f) => formatEnterpriseStatus(f.entityType) },
            { key: 'fieldType', label: 'Type', cell: (f) => f.fieldType, hideBelow: 'lg' },
        ],
    };

    readonly listFn = (filters: Parameters<CustomFieldService['list']>[0]) =>
        this.customFieldService.list(filters);

    readonly createFn = async () => {
        await this.openFieldDialog();
        return null;
    };

    readonly deleteFn = (id: string) => this.customFieldService.delete(id);

    readonly openDetailFn = (item: CustomFieldDefinition) => this.openFieldDialog(item.id);

    private async openFieldDialog(fieldId?: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./custom-field-dialog.component').CustomFieldDialogComponent,
            import('./custom-field-dialog.component').CustomFieldDialogData,
            import('./custom-field-dialog.component').CustomFieldDialogResult
        >(
            () =>
                import('./custom-field-dialog.component').then((m) => m.CustomFieldDialogComponent),
            { data: { fieldId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.shell()?.reload();
        });
    }
}

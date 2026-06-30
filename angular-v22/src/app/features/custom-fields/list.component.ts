import { Component, inject } from '@angular/core';
import type { CustomFieldDefinition } from '@models/enterprise.model';
import { CustomFieldService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

@Component({
    selector: 'app-custom-fields-list',
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
export class CustomFieldsListComponent {
    private readonly customFieldService = inject(CustomFieldService);

    readonly config: EnterpriseListConfig<CustomFieldDefinition> = {
        title: 'Custom fields',
        description: 'Extended field definitions for CRM entities',
        entityLabel: 'field',
        columns: [
            { key: 'label', label: 'Label', cell: (f) => f.label },
            { key: 'key', label: 'Key', cell: (f) => f.key, hideBelow: 'md' },
            { key: 'entityType', label: 'Entity', cell: (f) => f.entityType },
            { key: 'fieldType', label: 'Type', cell: (f) => f.fieldType, hideBelow: 'lg' },
        ],
    };

    readonly listFn = (filters: Parameters<CustomFieldService['list']>[0]) =>
        this.customFieldService.list(filters);

    readonly createFn = () =>
        this.customFieldService.create({
            entityType: 'contact',
            key: `field_${Date.now()}`,
            label: 'New field',
            fieldType: 'text',
        });

    readonly deleteFn = (id: string) => this.customFieldService.delete(id);
}

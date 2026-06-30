import { Component, inject } from '@angular/core';
import type { Territory } from '@models/enterprise.model';
import { TerritoryService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseDate } from '../enterprise/enterprise-list.util';

@Component({
    selector: 'app-territories-list',
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
export class TerritoriesListComponent {
    private readonly territoryService = inject(TerritoryService);

    readonly config: EnterpriseListConfig<Territory> = {
        title: 'Territories',
        description: 'Sales territory definitions',
        entityLabel: 'territory',
        columns: [
            { key: 'name', label: 'Name', cell: (t) => t.name },
            {
                key: 'createdAt',
                label: 'Created',
                cell: (t) => formatEnterpriseDate(t.createdAt),
                hideBelow: 'md',
            },
        ],
    };

    readonly listFn = (filters: Parameters<TerritoryService['list']>[0]) =>
        this.territoryService.list(filters);

    readonly createFn = () =>
        this.territoryService.create({
            name: `Territory ${new Date().toLocaleDateString()}`,
            rules: {},
        });

    readonly deleteFn = (id: string) => this.territoryService.delete(id);
}

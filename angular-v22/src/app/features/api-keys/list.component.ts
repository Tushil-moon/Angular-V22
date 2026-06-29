import { Component, inject } from '@angular/core';
import type { ApiKey } from '@models/enterprise.model';
import { ApiKeyService } from '@services/index';
import {
    EnterpriseListShellComponent,
    type EnterpriseListConfig,
} from '@shared/components/enterprise-list-shell.component';
import { formatEnterpriseDate } from '../enterprise/enterprise-list.util';

@Component({
    selector: 'app-api-keys-list',
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
export class ApiKeysListComponent {
    private readonly apiKeyService = inject(ApiKeyService);

    readonly config: EnterpriseListConfig<ApiKey> = {
        title: 'API keys',
        description: 'Programmatic access keys',
        entityLabel: 'API key',
        columns: [
            { key: 'name', label: 'Name', cell: (k) => k.name },
            { key: 'prefix', label: 'Prefix', cell: (k) => k.prefix },
            {
                key: 'expiresAt',
                label: 'Expires',
                cell: (k) => formatEnterpriseDate(k.expiresAt),
                hideBelow: 'md',
            },
        ],
    };

    readonly listFn = (filters: Parameters<ApiKeyService['list']>[0]) =>
        this.apiKeyService.list(filters);

    readonly createFn = () =>
        this.apiKeyService.create({
            name: `Key ${new Date().toLocaleDateString()}`,
        });

    readonly deleteFn = (id: string) => this.apiKeyService.delete(id);
}

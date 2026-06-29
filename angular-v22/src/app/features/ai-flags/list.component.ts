import { Component, inject } from '@angular/core';
import type { AiFeatureFlag } from '@models/enterprise.model';
import { AiService } from '@services/index';
import {
    EnterpriseListShellComponent,
    type EnterpriseListConfig,
} from '@shared/components/enterprise-list-shell.component';
import { formatEnterpriseBool } from '../enterprise/enterprise-list.util';

@Component({
    selector: 'app-ai-flags-list',
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
export class AiFlagsListComponent {
    private readonly aiService = inject(AiService);

    readonly config: EnterpriseListConfig<AiFeatureFlag> = {
        title: 'AI feature flags',
        description: 'Toggle AI capabilities per organization',
        entityLabel: 'flag',
        columns: [
            { key: 'feature', label: 'Feature', cell: (f) => f.feature },
            { key: 'enabled', label: 'Enabled', cell: (f) => formatEnterpriseBool(f.enabled) },
        ],
    };

    readonly listFn = (filters: Parameters<AiService['listFlags']>[0]) =>
        this.aiService.listFlags(filters);

    readonly createFn = () =>
        this.aiService.createFlag({
            feature: `feature_${Date.now()}`,
            enabled: false,
        });

    readonly deleteFn = (id: string) => this.aiService.deleteFlag(id);
}

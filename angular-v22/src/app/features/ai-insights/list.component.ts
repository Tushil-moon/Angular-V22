import { Component, inject } from '@angular/core';
import type { AiInsight } from '@models/enterprise.model';
import { AiService } from '@services/index';
import {
    EnterpriseListShellComponent,
    type EnterpriseListConfig,
} from '@shared/components/enterprise-list-shell.component';
import { formatEnterpriseDate } from '../enterprise/enterprise-list.util';

@Component({
    selector: 'app-ai-insights-list',
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
export class AiInsightsListComponent {
    private readonly aiService = inject(AiService);

    readonly config: EnterpriseListConfig<AiInsight> = {
        title: 'AI insights',
        description: 'Generated insights on CRM records',
        entityLabel: 'insight',
        columns: [
            { key: 'type', label: 'Type', cell: (i) => i.type },
            { key: 'entityType', label: 'Entity', cell: (i) => i.entityType },
            { key: 'entityId', label: 'Record ID', cell: (i) => i.entityId, hideBelow: 'md' },
            {
                key: 'createdAt',
                label: 'Created',
                cell: (i) => formatEnterpriseDate(i.createdAt),
                hideBelow: 'lg',
            },
        ],
    };

    readonly listFn = (filters: Parameters<AiService['listInsights']>[0]) =>
        this.aiService.listInsights(filters);

    readonly createFn = () =>
        this.aiService.createInsight({
            entityType: 'deal',
            entityId: 'sample',
            type: 'summary',
            payload: {},
        });

    readonly deleteFn = (id: string) => this.aiService.deleteInsight(id);
}

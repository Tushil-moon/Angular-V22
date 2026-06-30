import { Component, inject } from '@angular/core';
import type { KnowledgeArticle } from '@models/enterprise.model';
import { KnowledgeService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseBool, formatEnterpriseDate } from '../enterprise/enterprise-list.util';

@Component({
    selector: 'app-knowledge-list',
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
export class KnowledgeListComponent {
    private readonly knowledgeService = inject(KnowledgeService);

    readonly config: EnterpriseListConfig<KnowledgeArticle> = {
        title: 'Knowledge base',
        description: 'Help articles for customers and agents',
        entityLabel: 'article',
        columns: [
            { key: 'title', label: 'Title', cell: (a) => a.title },
            { key: 'published', label: 'Published', cell: (a) => formatEnterpriseBool(a.published) },
            {
                key: 'createdAt',
                label: 'Created',
                cell: (a) => formatEnterpriseDate(a.createdAt),
                hideBelow: 'md',
            },
        ],
    };

    readonly listFn = (filters: Parameters<KnowledgeService['list']>[0]) =>
        this.knowledgeService.list(filters);

    readonly createFn = () =>
        this.knowledgeService.create({
            title: 'New article',
            body: 'Article content goes here.',
            published: false,
        });

    readonly deleteFn = (id: string) => this.knowledgeService.delete(id);
}

import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import type { KnowledgeArticle } from '@models/enterprise.model';
import { DialogService, KnowledgeService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseBool, formatEnterpriseDate } from '../enterprise/enterprise-list.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-knowledge-list',
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
            listTitle="Help articles"
        />
    `,
})
export class KnowledgeListComponent {
    private readonly knowledgeService = inject(KnowledgeService);
    private readonly dialogService = inject(DialogService);
    private readonly shell = viewChild<EnterpriseListShellComponent<KnowledgeArticle>>('shell');

    readonly config: EnterpriseListConfig<KnowledgeArticle> = {
        title: 'Knowledge base',
        description: 'Help articles for customers and agents',
        entityLabel: 'article',
        cardTitle: (a) => a.title,
        cardSubtitle: (a) => a.category ?? 'General',
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Published', value: 'true' },
            { label: 'Drafts', value: 'false' },
        ],
        columns: [
            { key: 'title', label: 'Title', cell: (a) => a.title },
            { key: 'category', label: 'Category', cell: (a) => a.category ?? '—' },
            { key: 'published', label: 'Published', cell: (a) => formatEnterpriseBool(a.published) },
            {
                key: 'views',
                label: 'Views',
                cell: (a) => String(a.viewCount ?? 0),
                hideBelow: 'md',
            },
            {
                key: 'createdAt',
                label: 'Created',
                cell: (a) => formatEnterpriseDate(a.createdAt),
                hideBelow: 'md',
            },
        ],
    };

    readonly listFn = (filters: Parameters<KnowledgeService['list']>[0]) => {
        const status = filters?.['status'];
        const published =
            status === 'true' ? true : status === 'false' ? false : undefined;
        return this.knowledgeService.list({ ...filters, published, status: undefined });
    };

    readonly createFn = async () => {
        await this.openArticleDialog();
        return null;
    };

    readonly deleteFn = (id: string) => this.knowledgeService.delete(id);

    readonly openDetailFn = (item: KnowledgeArticle) => this.openArticleDialog(item.id);

    private async openArticleDialog(articleId?: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./knowledge-article-dialog.component').KnowledgeArticleDialogComponent,
            import('./knowledge-article-dialog.component').KnowledgeArticleDialogData,
            import('./knowledge-article-dialog.component').KnowledgeArticleDialogResult
        >(
            () =>
                import('./knowledge-article-dialog.component').then(
                    (m) => m.KnowledgeArticleDialogComponent,
                ),
            { data: { articleId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.shell()?.reload();
        });
    }
}

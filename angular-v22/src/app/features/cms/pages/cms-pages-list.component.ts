import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
    CATALOG_STATUS_TABS,
    catalogStatusVariant,
    listTotalCount,
    openNameSlugDialog,
    slugify,
} from '@features/shared/admin-list.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { DialogService } from '@services/dialog.service';
import { AuthService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { forkJoin, Observable, of, switchMap } from 'rxjs';

import type { CmsPage } from '../models/cms.model';
import { CmsApiService } from '../services/cms-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-cms-pages-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [kpis]="kpiCards()"
            listTitle="Page list"
        />
    `,
})
export class CmsPagesListComponent {
    private readonly api = inject(CmsApiService);
    private readonly dialog = inject(DialogService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<CmsPage> = {
        title: 'Pages',
        description: 'Manage CMS content pages.',
        entityLabel: 'page',
        managePermission: Permissions.ManageCms,
        statusTabs: CATALOG_STATUS_TABS,
        columns: [
            { key: 'title', label: 'Title', cell: (i) => i.title },
            { key: 'slug', label: 'Slug', cell: (i) => i.slug, hideBelow: 'md' },
            {
                key: 'status',
                label: 'Status',
                cell: (i) => i.status,
                badge: (i) => ({ text: i.status, variant: catalogStatusVariant(i.status) }),
            },
        ],
        cardTitle: (i) => i.title,
        cardSubtitle: (i) => i.slug,
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, published: 0, draft: 0 });
            const count = (status?: string) => listTotalCount((f) => this.api.listPages(f), status);
            return forkJoin({
                total: count(),
                published: count('PUBLISHED'),
                draft: count('DRAFT'),
            });
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0, published: 0, draft: 0 };
        return [
            { label: 'Total pages', value: String(s.total), detail: 'All CMS pages', icon: 'file-text' },
            { label: 'Published', value: String(s.published), detail: 'Live on storefront', icon: 'check' },
            { label: 'Draft', value: String(s.draft), detail: 'Not published yet', icon: 'file-text' },
        ];
    });

    readonly listFn = (f: FilterOptions): Observable<PaginatedResponse<CmsPage>> =>
        this.api.listPages(f);
    readonly createFn = (): Observable<CmsPage | null> =>
        openNameSlugDialog(this.dialog, { title: 'New page', submitLabel: 'Create page' }).pipe(
            switchMap((r) =>
                r ? this.api.createPage({ title: r.name, slug: r.slug || slugify(r.name) }) : of(null),
            ),
        );
    readonly deleteFn = (id: string): Observable<void> => this.api.deletePage(id);
}

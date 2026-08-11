/**
 * Collection list — enterprise shell with catalog KPIs
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
    CATALOG_STATUS_TABS,
    catalogStatusVariant,
    formatDateTime,
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

import type { Collection } from '../models/collection.model';
import { CollectionApiService } from '../services/collection-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-collection-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            listTitle="Collection list"
            [config]="config"
            [listFn]="listCollections"
            [createFn]="createCollection"
            [deleteFn]="deleteCollection"
            [kpis]="kpiCards()"
        />
    `,
})
export class CollectionListComponent {
    private readonly collectionApi = inject(CollectionApiService);
    private readonly dialog = inject(DialogService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<Collection> = {
        title: 'Collections',
        description: 'Curate merchandising groups shown across your storefront',
        entityLabel: 'collection',
        managePermission: Permissions.ManageCollections,
        statusTabs: CATALOG_STATUS_TABS,
        columns: [
            { key: 'name', label: 'Name', cell: (item) => item.name },
            { key: 'slug', label: 'Slug', cell: (item) => item.slug, hideBelow: 'md' },
            { key: 'type', label: 'Type', cell: (item) => item.type, hideBelow: 'lg' },
            {
                key: 'products',
                label: 'Products',
                cell: (item) => String(item.productCount),
                hideBelow: 'sm',
            },
            {
                key: 'status',
                label: 'Status',
                cell: (item) => item.status,
                badge: (item) => ({ text: item.status, variant: catalogStatusVariant(item.status) }),
            },
        ],
        cardTitle: (item) => item.name,
        cardSubtitle: (item) => item.slug,
        detailStatus: (item) => ({ text: item.status, variant: catalogStatusVariant(item.status) }),
        detailFields: (item) => [
            { label: 'Slug', value: item.slug },
            { label: 'Type', value: item.type },
            { label: 'Featured', value: item.featured ? 'Yes' : 'No' },
            { label: 'Products', value: String(item.productCount) },
            { label: 'Created', value: formatDateTime(item.createdAt) },
            { label: 'Updated', value: formatDateTime(item.updatedAt) },
        ],
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, published: 0, draft: 0 });
            const count = (status?: string) =>
                listTotalCount((f) => this.collectionApi.list(f), status);
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
            { label: 'Total collections', value: String(s.total), detail: 'All groups', icon: 'layers' },
            { label: 'Published', value: String(s.published), detail: 'Live on storefront', icon: 'check' },
            { label: 'Draft', value: String(s.draft), detail: 'Not published yet', icon: 'file-text' },
        ];
    });

    readonly listCollections = (filters: FilterOptions): Observable<PaginatedResponse<Collection>> =>
        this.collectionApi.list(filters);

    readonly createCollection = (): Observable<Collection | null> =>
        openNameSlugDialog(this.dialog, {
            title: 'Create collection',
            submitLabel: 'Create collection',
        }).pipe(
            switchMap((result) =>
                result
                    ? this.collectionApi.create({
                          name: result.name,
                          slug: result.slug || slugify(result.name),
                      })
                    : of(null),
            ),
        );

    readonly deleteCollection = (id: string): Observable<void> => this.collectionApi.delete(id);
}

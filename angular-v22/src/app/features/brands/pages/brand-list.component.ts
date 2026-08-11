/**
 * Brand list — enterprise shell with catalog KPIs
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

import type { Brand } from '../models/brand.model';
import { BrandApiService } from '../services/brand-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-brand-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            listTitle="Brand list"
            [config]="config"
            [listFn]="listBrands"
            [createFn]="createBrand"
            [deleteFn]="deleteBrand"
            [kpis]="kpiCards()"
        />
    `,
})
export class BrandListComponent {
    private readonly brandApi = inject(BrandApiService);
    private readonly dialog = inject(DialogService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<Brand> = {
        title: 'Brands',
        description: 'Manage the manufacturers and labels behind your products',
        entityLabel: 'brand',
        managePermission: Permissions.ManageBrands,
        statusTabs: CATALOG_STATUS_TABS,
        columns: [
            { key: 'name', label: 'Name', cell: (item) => item.name },
            { key: 'slug', label: 'Slug', cell: (item) => item.slug, hideBelow: 'md' },
            {
                key: 'website',
                label: 'Website',
                cell: (item) => item.website ?? '—',
                hideBelow: 'lg',
            },
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
            { label: 'Website', value: item.website ?? '—' },
            { label: 'Products', value: String(item.productCount) },
            { label: 'Sort order', value: String(item.sortOrder) },
            { label: 'Created', value: formatDateTime(item.createdAt) },
            { label: 'Updated', value: formatDateTime(item.updatedAt) },
        ],
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, published: 0, draft: 0 });
            const count = (status?: string) => listTotalCount((f) => this.brandApi.list(f), status);
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
            { label: 'Total brands', value: String(s.total), detail: 'All labels', icon: 'tag' },
            { label: 'Published', value: String(s.published), detail: 'Visible in catalog', icon: 'check' },
            { label: 'Draft', value: String(s.draft), detail: 'Not published yet', icon: 'file-text' },
        ];
    });

    readonly listBrands = (filters: FilterOptions): Observable<PaginatedResponse<Brand>> =>
        this.brandApi.list(filters);

    readonly createBrand = (): Observable<Brand | null> =>
        openNameSlugDialog(this.dialog, {
            title: 'Create brand',
            submitLabel: 'Create brand',
        }).pipe(
            switchMap((result) =>
                result
                    ? this.brandApi.create({
                          name: result.name,
                          slug: result.slug || slugify(result.name),
                      })
                    : of(null),
            ),
        );

    readonly deleteBrand = (id: string): Observable<void> => this.brandApi.delete(id);
}

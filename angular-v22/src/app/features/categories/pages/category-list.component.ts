/**
 * Categories — Figma kit Categories screen
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
import { forkJoin, map, type Observable, of, switchMap } from 'rxjs';

import type { Category } from '../models/category.model';
import { CategoryApiService } from '../services/category-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-category-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [kpis]="kpiCards()"
            listTitle="Category list"
        />
    `,
})
export class CategoryListComponent {
    private readonly api = inject(CategoryApiService);
    private readonly dialog = inject(DialogService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<Category> = {
        title: 'Categories',
        description: 'Organize products into hierarchical categories',
        entityLabel: 'category',
        managePermission: Permissions.ManageCategories,
        statusTabs: CATALOG_STATUS_TABS,
        columns: [
            { key: 'name', label: 'Name', cell: (item) => item.name },
            { key: 'slug', label: 'Slug', cell: (item) => item.slug, hideBelow: 'md' },
            {
                key: 'parent',
                label: 'Parent',
                cell: (item) => item.parentName ?? '—',
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
                badge: (item) => ({
                    text: item.status,
                    variant: catalogStatusVariant(item.status),
                }),
            },
        ],
        cardTitle: (item) => item.name,
        cardSubtitle: (item) => `${item.childCount} subcategories · ${item.productCount} products`,
        detailStatus: (item) => ({ text: item.status, variant: catalogStatusVariant(item.status) }),
        detailFields: (item) => [
            { label: 'Slug', value: item.slug },
            { label: 'Parent', value: item.parentName ?? '—' },
            { label: 'Sort order', value: String(item.sortOrder) },
            { label: 'Products', value: String(item.productCount) },
            { label: 'Subcategories', value: String(item.childCount) },
            { label: 'Description', value: item.description ?? '—' },
            { label: 'Created', value: formatDateTime(item.createdAt) },
            { label: 'Updated', value: formatDateTime(item.updatedAt) },
        ],
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, published: 0, draft: 0 });
            const count = (status?: string) => listTotalCount((f) => this.api.list(f), status);
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
            { label: 'Total categories', value: String(s.total), detail: 'All nodes', icon: 'folder-open' },
            { label: 'Published', value: String(s.published), detail: 'Visible in catalog', icon: 'check' },
            { label: 'Draft', value: String(s.draft), detail: 'Not published yet', icon: 'file-text' },
        ];
    });

    readonly listFn = (filters: FilterOptions): Observable<PaginatedResponse<Category>> =>
        this.api.list(filters);

    readonly createFn = (): Observable<Category | null> =>
        openNameSlugDialog(this.dialog, {
            title: 'Create category',
            submitLabel: 'Create category',
        }).pipe(
            switchMap((result) => {
                if (!result) return of(null);
                return this.api.create({
                    name: result.name,
                    slug: result.slug || slugify(result.name),
                    status: 'PUBLISHED',
                });
            }),
        );

    readonly deleteFn = (id: string): Observable<void> => this.api.delete(id).pipe(map(() => undefined));
}

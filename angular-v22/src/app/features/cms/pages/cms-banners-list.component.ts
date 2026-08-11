import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
    listFilteredCount,
    listTotalCount,
    openNameSlugDialog,
    orDash,
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

import type { CmsBanner } from '../models/cms.model';
import { CmsApiService } from '../services/cms-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-cms-banners-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [kpis]="kpiCards()"
            listTitle="Banner list"
        />
    `,
})
export class CmsBannersListComponent {
    private readonly api = inject(CmsApiService);
    private readonly dialog = inject(DialogService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<CmsBanner> = {
        title: 'Banners',
        description: 'Schedule storefront banners and hero slots.',
        entityLabel: 'banner',
        managePermission: Permissions.ManageCms,
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Enabled', value: 'true', filterKey: 'enabled' },
            { label: 'Disabled', value: 'false', filterKey: 'enabled' },
        ],
        columns: [
            { key: 'title', label: 'Title', cell: (i) => i.title },
            { key: 'position', label: 'Position', cell: (i) => orDash(i.position), hideBelow: 'md' },
            {
                key: 'status',
                label: 'Status',
                cell: (i) => (i.enabled ? 'Enabled' : 'Disabled'),
                badge: (i) => ({
                    text: i.enabled ? 'Enabled' : 'Disabled',
                    variant: i.enabled ? 'success' : 'secondary',
                }),
            },
        ],
        cardTitle: (i) => i.title,
        cardSubtitle: (i) => orDash(i.subtitle),
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, enabled: 0, disabled: 0 });
            const list = (f: FilterOptions) => this.api.listBanners(f);
            return forkJoin({
                total: listTotalCount(list),
                enabled: listFilteredCount(list, { enabled: true }),
                disabled: listFilteredCount(list, { enabled: false }),
            });
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0, enabled: 0, disabled: 0 };
        return [
            { label: 'Total banners', value: String(s.total), detail: 'All hero slots', icon: 'panel-top' },
            { label: 'Enabled', value: String(s.enabled), detail: 'Visible on storefront', icon: 'check' },
            { label: 'Disabled', value: String(s.disabled), detail: 'Not scheduled', icon: 'file-text' },
        ];
    });

    readonly listFn = (f: FilterOptions): Observable<PaginatedResponse<CmsBanner>> =>
        this.api.listBanners(f);
    readonly createFn = (): Observable<CmsBanner | null> =>
        openNameSlugDialog(this.dialog, {
            title: 'New banner',
            showSlug: false,
            submitLabel: 'Create banner',
        }).pipe(switchMap((r) => (r ? this.api.createBanner({ title: r.name }) : of(null))));
    readonly deleteFn = (id: string): Observable<void> => this.api.deleteBanner(id);
}

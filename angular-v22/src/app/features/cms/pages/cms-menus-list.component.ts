import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { listTotalCount, openNameSlugDialog, slugify } from '@features/shared/admin-list.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { DialogService } from '@services/dialog.service';
import { AuthService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { map, Observable, of, switchMap } from 'rxjs';

import type { CmsMenu } from '../models/cms.model';
import { CmsApiService } from '../services/cms-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-cms-menus-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [kpis]="kpiCards()"
            listTitle="Menu list"
        />
    `,
})
export class CmsMenusListComponent {
    private readonly api = inject(CmsApiService);
    private readonly dialog = inject(DialogService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<CmsMenu> = {
        title: 'Menus',
        description: 'Configure navigation menus.',
        entityLabel: 'menu',
        managePermission: Permissions.ManageCms,
        columns: [
            { key: 'name', label: 'Name', cell: (i) => i.name },
            { key: 'handle', label: 'Handle', cell: (i) => i.handle, hideBelow: 'sm' },
        ],
        cardTitle: (i) => i.name,
        cardSubtitle: (i) => i.handle,
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0 });
            return listTotalCount((f) => this.api.listMenus(f)).pipe(map((total) => ({ total })));
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0 };
        return [
            { label: 'Total menus', value: String(s.total), detail: 'Navigation trees', icon: 'list' },
        ];
    });

    readonly listFn = (f: FilterOptions): Observable<PaginatedResponse<CmsMenu>> =>
        this.api.listMenus(f);
    readonly createFn = (): Observable<CmsMenu | null> =>
        openNameSlugDialog(this.dialog, {
            title: 'New menu',
            submitLabel: 'Create menu',
        }).pipe(
            switchMap((r) =>
                r
                    ? this.api.createMenu({ name: r.name, handle: r.slug || slugify(r.name) })
                    : of(null),
            ),
        );
    readonly deleteFn = (id: string): Observable<void> => this.api.deleteMenu(id);
}

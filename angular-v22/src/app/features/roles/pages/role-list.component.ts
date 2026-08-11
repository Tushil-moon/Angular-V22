/**
 * Admin Role — Figma kit Admin Role screen
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { formatDateTime, listTotalCount, openNameSlugDialog, orDash } from '@features/shared/admin-list.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { DialogService } from '@services/dialog.service';
import { AuthService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { map, type Observable, of, switchMap } from 'rxjs';

import type { AdminRole } from '../models/role.model';
import { AdminRoleApiService } from '../services/role-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-role-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [kpis]="kpiCards()"
            listTitle="Role list"
        />
    `,
})
export class RoleListComponent {
    private readonly api = inject(AdminRoleApiService);
    private readonly dialog = inject(DialogService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<AdminRole> = {
        title: 'Admin Role',
        description: 'Configure roles and permission sets for staff access',
        entityLabel: 'role',
        managePermission: Permissions.ManageRoles,
        columns: [
            { key: 'name', label: 'Name', cell: (i) => i.name },
            {
                key: 'description',
                label: 'Description',
                cell: (i) => orDash(i.description),
                hideBelow: 'md',
            },
            {
                key: 'status',
                label: 'Status',
                cell: (i) => (i.isActive ? 'Active' : 'Inactive'),
                badge: (i) => ({
                    text: i.isActive ? 'Active' : 'Inactive',
                    variant: i.isActive ? 'success' : 'secondary',
                }),
            },
            {
                key: 'created',
                label: 'Created',
                cell: (i) => formatDateTime(i.createdAt),
                hideBelow: 'lg',
            },
        ],
        cardTitle: (i) => i.name,
        cardSubtitle: (i) => orDash(i.description),
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, active: 0 });
            return listTotalCount((f) => this.api.list(f)).pipe(
                map((total) => ({ total, active: total })),
            );
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0, active: 0 };
        return [
            { label: 'Total roles', value: String(s.total), detail: 'Permission sets', icon: 'shield' },
            { label: 'Staff access', value: String(s.active), detail: 'Configured roles', icon: 'users' },
        ];
    });

    readonly listFn = (f: FilterOptions): Observable<PaginatedResponse<AdminRole>> => this.api.list(f);

    readonly createFn = (): Observable<AdminRole | null> =>
        openNameSlugDialog(this.dialog, {
            title: 'New role',
            showSlug: false,
            submitLabel: 'Create role',
        }).pipe(switchMap((r) => (r ? this.api.create(r.name) : of(null))));

    readonly deleteFn = (id: string): Observable<void> => this.api.delete(id);
}

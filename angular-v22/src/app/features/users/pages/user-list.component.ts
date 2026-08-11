/**
 * Users — invite staff with email + password dialog
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
    catalogStatusVariant,
    formatDateTime,
    listTotalCount,
} from '@features/shared/admin-list.util';
import { openRecordFormDialog } from '@features/shared/record-form-dialog.util';
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

import type { AdminUser } from '../models/user.model';
import { AdminUserApiService } from '../services/user-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-user-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [kpis]="kpiCards()"
            listTitle="User list"
        />
    `,
})
export class UserListComponent {
    private readonly api = inject(AdminUserApiService);
    private readonly dialog = inject(DialogService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<AdminUser> = {
        title: 'Users',
        description: 'Administer staff and customer user accounts',
        entityLabel: 'user',
        managePermission: Permissions.ManageUsers,
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Active', value: 'ACTIVE' },
        ],
        columns: [
            { key: 'email', label: 'Email', cell: (i) => i.email },
            {
                key: 'status',
                label: 'Status',
                cell: (i) => i.status,
                badge: (i) => ({ text: i.status, variant: catalogStatusVariant(i.status) }),
            },
            {
                key: 'verified',
                label: 'Verified',
                cell: (i) => (i.emailVerified ? 'Yes' : 'No'),
                hideBelow: 'md',
            },
            {
                key: 'created',
                label: 'Created',
                cell: (i) => formatDateTime(i.createdAt),
                hideBelow: 'lg',
            },
        ],
        cardTitle: (i) => i.email,
        cardSubtitle: (i) => i.status,
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, active: 0 });
            const count = (status?: string) => listTotalCount((f) => this.api.list(f), status);
            return forkJoin({
                total: count(),
                active: count('ACTIVE'),
            });
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0, active: 0 };
        return [
            { label: 'Total users', value: String(s.total), detail: 'All accounts', icon: 'users' },
            { label: 'Active', value: String(s.active), detail: 'Can sign in', icon: 'check' },
        ];
    });

    readonly listFn = (f: FilterOptions): Observable<PaginatedResponse<AdminUser>> => this.api.list(f);

    readonly createFn = (): Observable<AdminUser | null> =>
        openRecordFormDialog(this.dialog, {
            title: 'Invite user',
            description: 'Create a login with email and a temporary password.',
            submitLabel: 'Create user',
            fields: [
                {
                    key: 'email',
                    label: 'Email',
                    type: 'email',
                    required: true,
                    placeholder: 'staff@example.com',
                },
                {
                    key: 'password',
                    label: 'Temporary password',
                    type: 'password',
                    required: true,
                    placeholder: 'Min. 10 characters',
                    hint: 'Share this password securely; the user should change it after login',
                    value: 'TempPass123!',
                },
            ],
        }).pipe(
            switchMap((result) => {
                const email = result?.['email']?.trim() ?? '';
                const password = result?.['password'] ?? '';
                if (!email || password.length < 10) return of(null);
                return this.api.create(email, password);
            }),
        );

    readonly deleteFn = (id: string): Observable<void> => this.api.delete(id);
}

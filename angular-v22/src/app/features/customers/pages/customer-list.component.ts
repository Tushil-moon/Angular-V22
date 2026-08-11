/**
 * Customer Management — Figma kit Customer screen (KPI + index list)
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { listTotalCount } from '@features/shared/admin-list.util';
import { openRecordFormDialog } from '@features/shared/record-form-dialog.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { DialogService } from '@services/dialog.service';
import { AuthService } from '@services/index';
import {
    type BadgeVariant,
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { ignorePromise } from '@utils/form-display.util';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { formatDateTime, formatMoney, orDash } from '../../shared/format.util';
import type { Customer, CustomerStatus } from '../models/customer.model';
import { CustomerApiService } from '../services/customer-api.service';

function statusBadge(status: CustomerStatus): { text: string; variant: BadgeVariant } {
    const variant: BadgeVariant =
        status === 'ACTIVE' ? 'success' : status === 'BLOCKED' ? 'destructive' : 'secondary';
    return { text: status, variant };
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-customer-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [openDetailFn]="openDetailFn"
            [kpis]="kpiCards()"
            listTitle="Customer list"
        />
    `,
})
export class CustomerListComponent {
    private readonly customerApi = inject(CustomerApiService);
    private readonly dialog = inject(DialogService);
    private readonly router = inject(Router);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<Customer> = {
        title: 'Customer Management',
        description: 'Accounts, spend, and order history across your storefront',
        entityLabel: 'customer',
        managePermission: Permissions.ManageCustomers,
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Active', value: 'ACTIVE' },
            { label: 'Blocked', value: 'BLOCKED' },
            { label: 'Inactive', value: 'INACTIVE' },
        ],
        columns: [
            { key: 'name', label: 'Name', cell: (item) => item.fullName },
            { key: 'email', label: 'Email', cell: (item) => orDash(item.email), hideBelow: 'md' },
            {
                key: 'orders',
                label: 'Orders',
                cell: (item) => String(item.totalOrders),
                hideBelow: 'sm',
            },
            {
                key: 'spent',
                label: 'Total spent',
                cell: (item) => formatMoney(item.totalSpent),
                hideBelow: 'lg',
            },
            {
                key: 'status',
                label: 'Status',
                cell: (item) => item.status,
                badge: (item) => statusBadge(item.status),
            },
        ],
        cardTitle: (item) => item.fullName,
        cardSubtitle: (item) => orDash(item.email),
        detailStatus: (item) => statusBadge(item.status),
        detailFields: (item) => [
            { label: 'Email', value: orDash(item.email) },
            { label: 'Phone', value: orDash(item.phone) },
            { label: 'Orders', value: String(item.totalOrders) },
            { label: 'Total spent', value: formatMoney(item.totalSpent) },
            { label: 'Last order', value: formatDateTime(item.lastOrderAt) },
            { label: 'Created', value: formatDateTime(item.createdAt) },
        ],
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, active: 0, blocked: 0 });
            const count = (status?: string) =>
                listTotalCount((f) => this.customerApi.listForShell(f), status);
            return forkJoin({
                total: count(),
                active: count('ACTIVE'),
                blocked: count('BLOCKED'),
            });
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0, active: 0, blocked: 0 };
        return [
            { label: 'Total customers', value: String(s.total), detail: 'All accounts', icon: 'users' },
            { label: 'Active', value: String(s.active), detail: 'Can place orders', icon: 'check' },
            { label: 'Blocked', value: String(s.blocked), detail: 'Restricted access', icon: 'shield' },
        ];
    });

    readonly listFn = (filters: FilterOptions): Observable<PaginatedResponse<Customer>> =>
        this.customerApi.listForShell(filters);

    readonly createFn = (): Observable<Customer | null> =>
        openRecordFormDialog(this.dialog, {
            title: 'New customer',
            description: 'Create a customer account with contact details.',
            submitLabel: 'Create customer',
            fields: [
                {
                    key: 'firstName',
                    label: 'First name',
                    required: true,
                    placeholder: 'Jane',
                },
                {
                    key: 'lastName',
                    label: 'Last name',
                    placeholder: 'Doe',
                },
                {
                    key: 'email',
                    label: 'Email',
                    type: 'email',
                    required: true,
                    placeholder: 'jane@example.com',
                },
                {
                    key: 'phone',
                    label: 'Phone',
                    placeholder: '+1 555 0100',
                },
            ],
        }).pipe(
            switchMap((result) => {
                if (!result?.['email']) return of(null);
                return this.customerApi.create({
                    email: result['email'],
                    firstName: result['firstName'],
                    lastName: result['lastName'] || undefined,
                    phone: result['phone'] || undefined,
                });
            }),
        );

    readonly deleteFn = (id: string): Observable<void> => this.customerApi.delete(id);

    readonly openDetailFn = (item: Customer): Observable<void> =>
        of(item).pipe(
            map((customer) => {
                ignorePromise(this.router.navigate(['/dashboard/customers', customer.id]));
            }),
        );
}

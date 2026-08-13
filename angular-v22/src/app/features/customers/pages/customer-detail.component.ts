/**
 * Customer Details — Figma kit customer profile layout
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@services/index';
import {
    BadgeComponent,
    type BadgeVariant,
    ButtonComponent,
    FlexTableCellComponent,
    FlexTableComponent,
    FlexTableRowComponent,
    IconComponent,
} from '@shared/components';
import type { FlexTableColumn } from '@shared/components/flex-table.types';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import { ignorePromise } from '@utils/form-display.util';
import { map, of } from 'rxjs';

import { formatDateTime, formatMoney, orDash } from '../../shared/format.util';
import type {
    CustomerDetail,
    CustomerOrderSummary,
    CustomerStatus,
} from '../models/customer.model';
import { CustomerApiService } from '../services/customer-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-customer-detail',
    imports: [
        RouterLink,
        FlexTableComponent,
        FlexTableRowComponent,
        FlexTableCellComponent,
        BadgeComponent,
        ButtonComponent,
        IconComponent,
    ],
    template: `
        <div class="index-page">
            <div class="index-header">
                <div class="index-header-copy">
                    <h1 class="index-title">{{ customer()?.fullName ?? 'Customer details' }}</h1>
                    <p class="index-subtitle">{{ display(customer()?.email ?? null) }}</p>
                </div>
                <div class="index-actions">
                    <a routerLink="/dashboard/customers" class="inline-flex">
                        <app-button variant="outline" size="sm" type="button">Back</app-button>
                    </a>
                </div>
            </div>

            @if (isLoading()) {
                <div class="home-panel p-8">
                    <p class="index-empty-desc">Loading customer…</p>
                </div>
            } @else if (!customer()) {
                <div class="home-panel p-8">
                    <p class="index-empty-title">Customer not found</p>
                    <p class="index-empty-desc">This customer could not be loaded.</p>
                </div>
            } @else {
                @let current = customer()!;

                <div class="index-metrics">
                    <div class="index-metric">
                        <p class="index-metric-label">Orders</p>
                        <p class="index-metric-value">{{ current.totalOrders }}</p>
                        <p class="om-kpi-meta">Lifetime orders</p>
                    </div>
                    <div class="index-metric">
                        <p class="index-metric-label">Total spent</p>
                        <p class="index-metric-value">{{ money(current.totalSpent) }}</p>
                        <p class="om-kpi-meta">All-time revenue</p>
                    </div>
                    <div class="index-metric">
                        <p class="index-metric-label">Avg. order</p>
                        <p class="index-metric-value">{{ money(current.averageOrderValue) }}</p>
                        <p class="om-kpi-meta">Basket value</p>
                    </div>
                    <div class="index-metric">
                        <div class="flex items-center justify-between gap-2">
                            <div>
                                <p class="index-metric-label">Status</p>
                                <div class="mt-2">
                                    <app-badge [variant]="statusVariant(current.status)">
                                        {{ current.status }}
                                    </app-badge>
                                </div>
                            </div>
                            <div class="index-metric-icon">
                                <app-icon name="user" [size]="18" />
                            </div>
                        </div>
                        <p class="om-kpi-meta">Joined {{ dateTime(current.createdAt) }}</p>
                    </div>
                </div>

                <div class="home-grid">
                    <section class="home-panel">
                        <div class="home-panel-header">
                            <div>
                                <h2 class="home-panel-title">Profile</h2>
                                <p class="home-panel-desc">Contact and marketing preferences</p>
                            </div>
                        </div>
                        <div class="home-panel-pad">
                            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</dt>
                                    <dd class="mt-1 text-sm text-foreground">{{ display(current.email) }}</dd>
                                </div>
                                <div>
                                    <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</dt>
                                    <dd class="mt-1 text-sm text-foreground">{{ display(current.phone) }}</dd>
                                </div>
                                <div>
                                    <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Marketing</dt>
                                    <dd class="mt-1 text-sm text-foreground">{{ current.acceptsMarketing ? 'Subscribed' : 'Opted out' }}</dd>
                                </div>
                                <div>
                                    <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last order</dt>
                                    <dd class="mt-1 text-sm text-foreground">{{ dateTime(current.lastOrderAt) }}</dd>
                                </div>
                            </dl>

                            @if (current.addresses.length > 0) {
                                <div class="mt-5 space-y-3">
                                    <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Addresses
                                    </p>
                                    @for (address of current.addresses; track address.id) {
                                        <div class="rounded-xl border border-border bg-muted/30 p-3">
                                            <p class="text-sm font-medium text-foreground">
                                                {{ display(address.name) }} · {{ address.type }}
                                            </p>
                                            <p class="text-xs text-muted-foreground">
                                                {{ address.addressLine1 }}, {{ address.city }}
                                                {{ address.postalCode }} {{ address.countryCode }}
                                            </p>
                                        </div>
                                    }
                                </div>
                            }
                        </div>
                    </section>

                    <aside class="home-panel">
                        <div class="home-panel-header">
                            <div>
                                <h2 class="home-panel-title">Lifetime value</h2>
                                <p class="home-panel-desc">Commerce summary</p>
                            </div>
                        </div>
                        <div class="home-link-list">
                            <div class="home-link">
                                <div class="home-link-icon">
                                    <app-icon name="shopping-cart" [size]="16" />
                                </div>
                                <div>
                                    <p class="home-link-label">{{ current.totalOrders }} orders</p>
                                    <p class="home-link-desc">Placed lifetime</p>
                                </div>
                            </div>
                            <div class="home-link">
                                <div class="home-link-icon">
                                    <app-icon name="credit-card" [size]="16" />
                                </div>
                                <div>
                                    <p class="home-link-label">{{ money(current.totalSpent) }}</p>
                                    <p class="home-link-desc">Total spent</p>
                                </div>
                            </div>
                            <div class="home-link">
                                <div class="home-link-icon">
                                    <app-icon name="chart-column" [size]="16" />
                                </div>
                                <div>
                                    <p class="home-link-label">{{ money(current.averageOrderValue) }}</p>
                                    <p class="home-link-desc">Average order value</p>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>

                <section class="home-panel mt-0">
                    <div class="home-panel-header">
                        <div>
                            <h2 class="home-panel-title">Recent orders</h2>
                            <p class="home-panel-desc">Latest checkouts for this customer</p>
                        </div>
                    </div>
                    <div class="home-panel-body">
                        <app-flex-table
                            [columns]="orderColumns"
                            [loading]="isLoadingOrders()"
                            [empty]="!isLoadingOrders() && orders().length === 0"
                            emptyTitle="No orders yet"
                            emptyDescription="This customer has not placed an order."
                            [flush]="true"
                            [skeletonRowCount]="3"
                        >
                            @for (order of orders(); track order.id) {
                                <app-flex-table-row
                                    class="home-table-row"
                                    [interactive]="true"
                                    (click)="openOrder(order.id)"
                                >
                                    <app-flex-table-cell column="orderNumber">
                                        <span class="index-cell-primary">#{{ order.orderNumber }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="placedAt">
                                        <span class="index-cell-muted">
                                            {{ dateTime(order.placedAt ?? order.createdAt) }}
                                        </span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="total">
                                        <span class="index-cell-money">{{ orderTotal(order) }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="status">
                                        <app-badge variant="outline">{{ order.status }}</app-badge>
                                    </app-flex-table-cell>
                                </app-flex-table-row>
                            }
                        </app-flex-table>
                    </div>
                </section>
            }
        </div>
    `,
})
export class CustomerDetailComponent {
    private readonly customerApi = inject(CustomerApiService);
    private readonly authService = inject(AuthService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly customerId = signal(this.route.snapshot.paramMap.get('id') ?? '');

    readonly orderColumns: FlexTableColumn[] = [
        { key: 'orderNumber', label: 'Order', grid: 'minmax(8rem, 1fr)', primary: true },
        { key: 'placedAt', label: 'Placed', grid: 'minmax(8rem, 1fr)', hideBelow: 'sm' },
        { key: 'total', label: 'Total', grid: 'minmax(6rem, 0.7fr)' },
        { key: 'status', label: 'Status', grid: 'minmax(6rem, 0.7fr)' },
    ];

    readonly customerResource = rxResource({
        params: () => {
            if (!this.authService.isAuthenticated() || !this.customerId()) return undefined;
            return { id: this.customerId() };
        },
        stream: ({ params, abortSignal }) => {
            if (!params) return of(null as CustomerDetail | null);

            throwIfAborted(abortSignal);
            return this.customerApi.getById(params.id).pipe(
                catchResourceStreamError<CustomerDetail | null>({
                    fallback: null,
                    logMessage: 'Failed to load customer:',
                }),
            );
        },
    });

    readonly ordersResource = rxResource({
        params: () => {
            if (!this.authService.isAuthenticated() || !this.customerId()) return undefined;
            return { id: this.customerId() };
        },
        stream: ({ params, abortSignal }) => {
            if (!params) return of([] as CustomerOrderSummary[]);

            throwIfAborted(abortSignal);
            return this.customerApi.listOrders(params.id, { page: 1, pageSize: 10 }).pipe(
                map((result) => result.data),
                catchResourceStreamError<CustomerOrderSummary[]>({
                    fallback: [],
                    logMessage: 'Failed to load customer orders:',
                }),
            );
        },
    });

    readonly customer = computed(() => this.customerResource.value() ?? null);
    readonly isLoading = computed(() => this.customerResource.isLoading());
    readonly orders = computed(() => this.ordersResource.value() ?? []);
    readonly isLoadingOrders = computed(() => this.ordersResource.isLoading());

    display(value: string | null): string {
        return orDash(value);
    }

    dateTime(value: string | null): string {
        return formatDateTime(value);
    }

    money(value: number): string {
        return formatMoney(value);
    }

    orderTotal(order: CustomerOrderSummary): string {
        return formatMoney(order.grandTotal, order.currencyCode);
    }

    statusVariant(status: CustomerStatus): BadgeVariant {
        if (status === 'ACTIVE') return 'success';
        if (status === 'BLOCKED') return 'destructive';
        return 'secondary';
    }

    openOrder(id: string): void {
        ignorePromise(this.router.navigate(['/dashboard/orders', id]));
    }
}

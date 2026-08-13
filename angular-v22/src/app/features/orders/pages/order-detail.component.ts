/**
 * Order detail — summary, totals, line items and status transitions
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { openRefundFormDialog } from '@features/refunds/utils/open-refund-form-dialog.util';
import { AuthService, DialogService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    BadgeComponent,
    type BadgeVariant,
    ButtonComponent,
    FlexTableCellComponent,
    FlexTableComponent,
    FlexTableRowComponent,
} from '@shared/components';
import type { FlexTableColumn } from '@shared/components/flex-table.types';
import { Permissions } from '@shared/constants/permissions';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import { finalize, of } from 'rxjs';

import {
    apiErrorMessage,
    formatDateTime,
    formatMoney,
    orDash,
    titleCase,
} from '../../shared/format.util';
import type { OrderDetail, OrderItem, OrderStatus } from '../models/order.model';
import { OrderApiService } from '../services/order-api.service';

type OrderAction = 'confirm' | 'cancel' | 'ship' | 'complete';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-order-detail',
    imports: [
        RouterLink,
        FlexTableComponent,
        FlexTableRowComponent,
        FlexTableCellComponent,
        BadgeComponent,
        ButtonComponent,
    ],
    template: `
        <div class="index-page">
            <div class="index-header">
                <div class="index-header-copy">
                    <h1 class="index-title">{{ order()?.orderNumber ?? 'Order' }}</h1>
                    <p class="index-subtitle">
                        {{ order() ? placedLabel() : 'Loading order details…' }}
                    </p>
                </div>
                <div class="index-actions">
                    <a routerLink="/dashboard/orders" class="inline-flex">
                        <app-button variant="outline" size="sm" type="button">Back to orders</app-button>
                    </a>
                </div>
            </div>

            @if (isLoading()) {
                <div class="home-panel p-8">
                    <p class="index-empty-desc">Loading order…</p>
                </div>
            } @else if (!order()) {
                <div class="home-panel p-8">
                    <p class="index-empty-title">Order not found</p>
                    <p class="index-empty-desc">This order could not be loaded.</p>
                </div>
            } @else {
                @let current = order()!;

                <div class="home-grid">
                    <section class="home-panel">
                        <div class="home-panel-header">
                            <div class="min-w-0">
                                <h2 class="home-panel-title">Summary</h2>
                                <p class="home-panel-desc">{{ display(current.customerEmail) }}</p>
                            </div>
                            <app-badge [variant]="statusVariant(current.status)">{{
                                current.status
                            }}</app-badge>
                        </div>
                        <div class="p-4 pt-0 sm:p-6 sm:pt-0">
                            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment</dt>
                                    <dd class="mt-1 text-sm text-foreground">{{ label(current.paymentStatus) }}</dd>
                                </div>
                                <div>
                                    <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fulfillment</dt>
                                    <dd class="mt-1 text-sm text-foreground">{{ label(current.fulfillmentStatus) }}</dd>
                                </div>
                                <div>
                                    <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Placed</dt>
                                    <dd class="mt-1 text-sm text-foreground">{{ placedLabel() }}</dd>
                                </div>
                                <div>
                                    <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</dt>
                                    <dd class="mt-1 text-sm text-foreground">{{ display(current.customerPhone) }}</dd>
                                </div>
                            </dl>

                            @if (canManage() || canCancel()) {
                                <div class="mt-5 flex flex-wrap gap-2">
                                    @if (canManage()) {
                                        <app-button
                                            size="sm"
                                            type="button"
                                            [disabled]="pendingAction() !== null"
                                            (clicked)="runAction('confirm')"
                                        >
                                            Confirm
                                        </app-button>
                                        <app-button
                                            size="sm"
                                            variant="outline"
                                            type="button"
                                            [disabled]="pendingAction() !== null"
                                            (clicked)="runAction('ship')"
                                        >
                                            Mark shipped
                                        </app-button>
                                        <app-button
                                            size="sm"
                                            variant="outline"
                                            type="button"
                                            [disabled]="pendingAction() !== null"
                                            (clicked)="runAction('complete')"
                                        >
                                            Complete
                                        </app-button>
                                    }
                                    @if (canCancel()) {
                                        <app-button
                                            size="sm"
                                            variant="destructive"
                                            type="button"
                                            [disabled]="pendingAction() !== null"
                                            (clicked)="runAction('cancel')"
                                        >
                                            Cancel order
                                        </app-button>
                                    }
                                    @if (canRequestRefund()) {
                                        <app-button
                                            size="sm"
                                            variant="outline"
                                            type="button"
                                            (clicked)="requestRefund()"
                                        >
                                            Request refund
                                        </app-button>
                                    }
                                </div>
                            }
                        </div>
                    </section>

                    <aside class="home-panel">
                        <div class="home-panel-header">
                            <h2 class="home-panel-title">Totals</h2>
                        </div>
                        <div class="p-4 pt-0 sm:p-6 sm:pt-0">
                            <dl class="space-y-3">
                                <div class="flex items-center justify-between gap-3">
                                    <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subtotal</dt>
                                    <dd class="text-sm font-medium text-foreground">{{ money(current.subtotal) }}</dd>
                                </div>
                                <div class="flex items-center justify-between gap-3">
                                    <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Discount</dt>
                                    <dd class="text-sm font-medium text-foreground">{{ money(current.discountTotal) }}</dd>
                                </div>
                                <div class="flex items-center justify-between gap-3">
                                    <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tax</dt>
                                    <dd class="text-sm font-medium text-foreground">{{ money(current.taxTotal) }}</dd>
                                </div>
                                <div class="flex items-center justify-between gap-3">
                                    <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Shipping</dt>
                                    <dd class="text-sm font-medium text-foreground">{{ money(current.shippingTotal) }}</dd>
                                </div>
                                <div class="flex items-center justify-between gap-3 border-t border-border pt-3">
                                    <dt class="text-sm font-semibold normal-case tracking-normal text-foreground">Grand total</dt>
                                    <dd class="text-sm font-medium text-foreground">{{ money(current.grandTotal) }}</dd>
                                </div>
                            </dl>
                        </div>
                    </aside>
                </div>

                <section class="index-card mt-4">
                    <div class="om-list-header">
                        <div>
                            <h2 class="om-list-title">Line items</h2>
                            <p class="index-subtitle">{{ current.items.length }} item(s) on this order</p>
                        </div>
                    </div>
                    <div class="index-body">
                        <app-flex-table
                            [columns]="itemColumns"
                            [empty]="current.items.length === 0"
                            emptyTitle="No line items"
                            emptyDescription="This order has no recorded items."
                            [flush]="true"
                        >
                            @for (item of current.items; track item.id) {
                                <app-flex-table-row>
                                    <app-flex-table-cell column="product">
                                        <span class="index-cell-primary truncate">{{
                                            item.productName
                                        }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="sku">
                                        <span class="index-cell-muted truncate">{{
                                            display(item.sku)
                                        }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="quantity">
                                        {{ item.quantity }}
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="unitPrice">
                                        {{ money(item.unitPrice) }}
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="lineTotal">
                                        {{ lineTotal(item) }}
                                    </app-flex-table-cell>
                                </app-flex-table-row>
                            }
                        </app-flex-table>
                    </div>
                </section>

                @if (current.statusHistory.length > 0) {
                    <section class="home-panel mt-4">
                        <div class="home-panel-header">
                            <h2 class="home-panel-title">Timeline</h2>
                        </div>
                        <div class="p-4 pt-0 sm:p-6 sm:pt-0">
                            <ol class="space-y-4 border-l border-border pl-4">
                                @for (entry of current.statusHistory; track entry.id) {
                                    <li>
                                        <p class="text-sm font-medium text-foreground">{{ label(entry.toStatus) }}</p>
                                        <p class="mt-0.5 text-xs text-muted-foreground">
                                            {{ dateTime(entry.createdAt) }}
                                            @if (entry.note) {
                                                · {{ entry.note }}
                                            }
                                        </p>
                                    </li>
                                }
                            </ol>
                        </div>
                    </section>
                }
            }
        </div>
    `,
})
export class OrderDetailComponent {
    private readonly orderApi = inject(OrderApiService);
    private readonly authService = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly toast = inject(ToastService);
    private readonly dialog = inject(DialogService);
    private readonly route = inject(ActivatedRoute);

    readonly orderId = signal(this.route.snapshot.paramMap.get('id') ?? '');
    readonly pendingAction = signal<OrderAction | null>(null);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageOrders),
    );
    readonly canCancel = computed(() =>
        this.permissionService.hasAny(Permissions.CancelOrders, Permissions.ManageOrders),
    );
    readonly canRequestRefund = computed(() => {
        if (!this.permissionService.hasPermission(Permissions.ManageRefunds)) return false;
        const order = this.order();
        if (!order) return false;
        return (
            order.status !== 'CANCELLED' &&
            order.status !== 'REFUNDED' &&
            order.paymentStatus !== 'PENDING' &&
            order.paymentStatus !== 'FAILED'
        );
    });

    readonly itemColumns: FlexTableColumn[] = [
        { key: 'product', label: 'Product', grid: 'minmax(10rem, 1.6fr)', primary: true },
        { key: 'sku', label: 'SKU', grid: 'minmax(6rem, 0.8fr)', hideBelow: 'md' },
        { key: 'quantity', label: 'Qty', grid: '4rem' },
        { key: 'unitPrice', label: 'Unit price', grid: 'minmax(6rem, 0.7fr)', hideBelow: 'sm' },
        { key: 'lineTotal', label: 'Total', grid: 'minmax(6rem, 0.7fr)' },
    ];

    readonly orderResource = rxResource({
        params: () => {
            if (!this.authService.isAuthenticated() || !this.orderId()) return undefined;
            return { id: this.orderId() };
        },
        stream: ({ params, abortSignal }) => {
            if (!params) return of(null as OrderDetail | null);

            throwIfAborted(abortSignal);
            return this.orderApi.getById(params.id).pipe(
                catchResourceStreamError<OrderDetail | null>({
                    fallback: null,
                    logMessage: 'Failed to load order:',
                }),
            );
        },
    });

    readonly order = computed(() => this.orderResource.value() ?? null);
    readonly isLoading = computed(() => this.orderResource.isLoading());

    readonly placedLabel = computed(() => {
        const current = this.order();
        if (!current) return '';
        return `Placed ${formatDateTime(current.placedAt ?? current.createdAt)}`;
    });

    display(value: string | null): string {
        return orDash(value);
    }

    label(value: string | null): string {
        return titleCase(value);
    }

    dateTime(value: string | null): string {
        return formatDateTime(value);
    }

    money(value: number): string {
        return formatMoney(value, this.order()?.currencyCode ?? 'USD');
    }

    lineTotal(item: OrderItem): string {
        return this.money(item.lineTotal);
    }

    statusVariant(status: OrderStatus): BadgeVariant {
        switch (status) {
            case 'DELIVERED':
            case 'COMPLETED':
                return 'success';
            case 'CANCELLED':
            case 'REFUNDED':
                return 'destructive';
            case 'PENDING':
                return 'warning';
            case 'SHIPPED':
            case 'PACKED':
                return 'secondary';
            default:
                return 'outline';
        }
    }

    requestRefund(): void {
        const id = this.orderId();
        if (!id) return;

        openRefundFormDialog(this.dialog, { orderId: id }).subscribe((result) => {
            if (result === 'saved') {
                this.orderResource.reload();
            }
        });
    }

    runAction(action: OrderAction): void {
        const id = this.orderId();
        if (!id || this.pendingAction()) return;

        this.pendingAction.set(action);
        const request$ =
            action === 'confirm'
                ? this.orderApi.confirm(id)
                : action === 'cancel'
                  ? this.orderApi.cancel(id)
                  : action === 'ship'
                    ? this.orderApi.ship(id)
                    : this.orderApi.complete(id);

        request$.pipe(finalize(() => this.pendingAction.set(null))).subscribe({
            next: () => {
                this.toast.success('Order updated', `Order ${action} succeeded.`);
                this.orderResource.reload();
            },
            error: (error: unknown) => {
                this.toast.error(apiErrorMessage(error, `Could not ${action} this order.`));
            },
        });
    }
}

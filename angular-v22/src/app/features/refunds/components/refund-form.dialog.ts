/**
 * Request refund dialog — order, amount, reason
 */

import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { apiErrorMessage, formatMoney } from '@features/shared/admin-list.util';
import type { OrderDetail } from '@features/orders/models/order.model';
import { OrderApiService } from '@features/orders/services/order-api.service';
import { AuthService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    DialogComponent,
    IconComponent,
    InputComponent,
    LoaderComponent,
    SelectComponent,
    type SelectOption,
    TextareaComponent,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { DialogRef } from '@shared/dialog/dialog-ref';
import { DIALOG_DATA } from '@shared/dialog/dialog.tokens';
import { map } from 'rxjs';

import { RefundApiService } from '../services/refund-api.service';

export interface RefundFormDialogData {
    orderId?: string | null;
}

export type RefundFormDialogResult = 'saved';

interface RefundFormModel {
    orderId: string;
    amount: string;
    reason: string;
    note: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-refund-form-dialog',
    imports: [
        DialogComponent,
        ButtonComponent,
        IconComponent,
        LoaderComponent,
        InputComponent,
        TextareaComponent,
        SelectComponent,
    ],
    template: `
        <app-dialog
            title="Request refund"
            description="Create a refund request for a paid order. It will enter the approval workflow."
            titleIcon="undo-2"
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="flex min-h-48 items-center justify-center py-10">
                    <app-loader />
                </div>
            } @else {
                <form class="dialog-form space-y-4" (submit)="onSubmit($event)">
                    @if (prefilledOrderId()) {
                        <div class="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                            <p class="font-medium text-foreground">
                                Order {{ loadedOrder()?.orderNumber ?? prefilledOrderId() }}
                            </p>
                            @if (loadedOrder(); as order) {
                                <p class="mt-1 text-muted-foreground">
                                    Total {{ formatMoney(order.grandTotal, order.currencyCode) }}
                                    · {{ order.paymentStatus }}
                                </p>
                                @if (maxRefundable() !== null) {
                                    <p class="form-hint mt-2">
                                        Up to {{ formatMoney(maxRefundable()!, order.currencyCode) }}
                                        refundable
                                    </p>
                                }
                            }
                        </div>
                    } @else {
                        <app-select
                            id="refund-order"
                            label="Order"
                            placeholder="Select an order"
                            [options]="orderOptions()"
                            [value]="model().orderId"
                            (valueChange)="onOrderChange($event)"
                        />
                        @if (loadedOrder(); as order) {
                            <p class="form-hint">
                                Order total
                                {{ formatMoney(order.grandTotal, order.currencyCode) }} · max refundable
                                {{ formatMoney(maxRefundable() ?? 0, order.currencyCode) }}
                            </p>
                        }
                    }

                    <app-input
                        id="refund-amount"
                        label="Refund amount"
                        type="number"
                        placeholder="0.00"
                        hint="Partial or full refund amount"
                        [required]="true"
                        [modelValue]="model().amount"
                        [error]="fieldError('amount')"
                        (valueChange)="patch({ amount: $event })"
                    />

                    <app-input
                        id="refund-reason"
                        label="Reason"
                        placeholder="Customer return, damaged item, etc."
                        [modelValue]="model().reason"
                        (valueChange)="patch({ reason: $event })"
                    />

                    <app-textarea
                        id="refund-note"
                        label="Internal note"
                        placeholder="Optional note for the finance team"
                        [rows]="3"
                        [modelValue]="model().note"
                        (valueChange)="patch({ note: $event })"
                    />
                </form>
            }

            <div
                dialogFooter
                class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
                <app-button type="button" variant="ghost" size="toolbar" (clicked)="cancel()">
                    Cancel
                </app-button>
                @if (canManage()) {
                    <app-button
                        type="button"
                        variant="primary"
                        size="toolbar"
                        [disabled]="saving() || loading()"
                        (clicked)="save()"
                    >
                        @if (saving()) {
                            <app-loader size="sm" [inline]="true" />
                            Submitting…
                        } @else {
                            <app-icon name="undo-2" [size]="14" />
                            Submit request
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class RefundFormDialogComponent implements OnInit {
    readonly data = inject<RefundFormDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(
        DialogRef<RefundFormDialogComponent, RefundFormDialogResult | null>,
    );
    private readonly refundApi = inject(RefundApiService);
    private readonly orderApi = inject(OrderApiService);
    private readonly auth = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly toast = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly formatMoney = formatMoney;

    readonly prefilledOrderId = computed(() => this.data.orderId ?? null);
    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageRefunds),
    );

    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly loadedOrder = signal<OrderDetail | null>(null);
    readonly orderOptions = signal<SelectOption[]>([{ value: '', label: 'Select an order' }]);
    readonly fieldErrors = signal<Record<string, string>>({});

    readonly model = signal<RefundFormModel>({
        orderId: this.data.orderId ?? '',
        amount: '',
        reason: '',
        note: '',
    });

    readonly maxRefundable = computed(() => {
        const order = this.loadedOrder();
        if (!order) return null;
        return Math.max(0, order.grandTotal - order.amountRefunded);
    });

    ngOnInit(): void {
        if (!this.auth.isAuthenticated()) return;

        this.loading.set(true);
        const orderId = this.prefilledOrderId();

        if (orderId) {
            this.loadOrder(orderId);
            return;
        }

        this.orderApi
            .list({ page: 1, pageSize: 50 })
            .pipe(
                map((result) => [
                    { value: '', label: 'Select an order' },
                    ...result.data.map((order) => ({
                        value: order.id,
                        label: `${order.orderNumber} · ${formatMoney(order.grandTotal, order.currencyCode)}`,
                    })),
                ]),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (options) => {
                    this.orderOptions.set(options);
                    this.loading.set(false);
                },
                error: () => {
                    this.loading.set(false);
                    this.toast.error('Failed to load orders.');
                },
            });
    }

    patch(partial: Partial<RefundFormModel>): void {
        this.model.update((current) => ({ ...current, ...partial }));
    }

    onOrderChange(orderId: string): void {
        this.patch({ orderId });
        if (orderId) this.loadOrder(orderId);
        else this.loadedOrder.set(null);
    }

    cancel(): void {
        this.dialogRef.close(null);
    }

    onSubmit(event: Event): void {
        event.preventDefault();
        this.save();
    }

    save(): void {
        if (!this.canManage() || this.saving()) return;

        const values = this.model();
        const errors: Record<string, string> = {};
        const amount = Number(values.amount);

        if (!values.orderId) errors['orderId'] = 'Select an order';
        if (!Number.isFinite(amount) || amount <= 0) {
            errors['amount'] = 'Enter a valid refund amount';
        } else if (this.maxRefundable() !== null && amount > this.maxRefundable()! + 0.0001) {
            errors['amount'] = 'Amount exceeds refundable balance';
        }

        this.fieldErrors.set(errors);
        if (Object.keys(errors).length) return;

        this.saving.set(true);
        this.refundApi
            .create({
                orderId: values.orderId,
                amount,
                reason: values.reason.trim() || null,
                note: values.note.trim() || null,
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (result) => {
                    this.saving.set(false);
                    if (!result) {
                        this.toast.error('Unable to create refund request.');
                        return;
                    }
                    this.toast.success('Refund request submitted');
                    this.dialogRef.close('saved');
                },
                error: (error: unknown) => {
                    this.saving.set(false);
                    this.toast.error(apiErrorMessage(error, 'Failed to create refund request.'));
                },
            });
    }

    fieldError(key: string): string | null {
        return this.fieldErrors()[key] ?? null;
    }

    private loadOrder(orderId: string): void {
        this.loading.set(true);
        this.orderApi
            .getById(orderId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (order) => {
                    this.loadedOrder.set(order);
                    if (order && !this.model().amount) {
                        this.patch({ amount: String(order.grandTotal) });
                    }
                    this.loading.set(false);
                },
                error: () => {
                    this.loading.set(false);
                    this.toast.error('Failed to load order.');
                },
            });
    }
}

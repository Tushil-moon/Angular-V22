/**
 * Quote Detail Dialog — view, edit line items, lifecycle actions
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormArray, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Product, Quote, QuoteHistoryEntry } from '@models/enterprise.model';
import {
    DealService,
    PermissionService,
    ProductService,
    QuoteService,
} from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    BadgeComponent,
    ButtonComponent,
    DialogComponent,
    InputComponent,
    LoaderComponent,
    SelectComponent,
    SelectOption,
    TextareaComponent,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';

import {
    formatEnterpriseCurrency,
    formatEnterpriseDate,
} from '../enterprise/enterprise-list.util';
import {
    enterpriseStatusBadge,
    formatEnterpriseStatus,
} from '../enterprise/enterprise-ui.util';

export interface QuoteDetailDialogData {
    quoteId?: string;
}

export type QuoteDetailDialogResult = 'saved' | 'deleted' | 'updated';

const HISTORY_LABELS: Record<string, string> = {
    CREATED: 'Created',
    UPDATED: 'Updated',
    SENT: 'Sent to customer',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    LINE_ITEMS_CHANGED: 'Line items updated',
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-quote-detail-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        LoaderComponent,
        InputComponent,
        SelectComponent,
        TextareaComponent,
        BadgeComponent,
    ],
    template: `
        <app-dialog
            [title]="dialogTitle()"
            description="Configure line items, pricing, and quote lifecycle."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-5">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-input id="quote-title" label="Title" formControlName="title" [required]="true" />
                        <app-input
                            id="quote-number"
                            label="Quote number"
                            formControlName="quoteNumber"
                        />
                    </div>

                    <div class="grid gap-4 sm:grid-cols-3">
                        <app-select
                            id="quote-deal"
                            label="Deal"
                            formControlName="dealId"
                            [options]="dealOptions()"
                            placeholder="Optional"
                        />
                        <app-input
                            id="quote-valid"
                            type="date"
                            label="Valid until"
                            formControlName="validUntil"
                        />
                        <app-input
                            id="quote-currency"
                            label="Currency"
                            formControlName="currency"
                        />
                    </div>

                    <app-textarea id="quote-notes" label="Notes" formControlName="notes" />

                    <div class="space-y-3">
                        <div class="flex items-center justify-between gap-2">
                            <p class="text-sm font-medium text-foreground">Line items</p>
                            @if (canEdit()) {
                                <app-button type="button" variant="outline" size="sm" (clicked)="addLineItem()">
                                    Add line
                                </app-button>
                            }
                        </div>

                        <div class="space-y-3" formArrayName="lineItems">
                            @for (line of lineItems.controls; track $index; let i = $index) {
                                <div
                                    class="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-6"
                                    [formGroupName]="i"
                                >
                                    <app-select
                                        [id]="'line-product-' + i"
                                        label="Product"
                                        formControlName="productId"
                                        [options]="productOptions()"
                                        placeholder="Custom"
                                        class="sm:col-span-2"
                                    />
                                    <app-input
                                        [id]="'line-desc-' + i"
                                        label="Description"
                                        formControlName="description"
                                        class="sm:col-span-2"
                                    />
                                    <app-input
                                        [id]="'line-qty-' + i"
                                        type="number"
                                        label="Qty"
                                        formControlName="quantity"
                                    />
                                    <app-input
                                        [id]="'line-price-' + i"
                                        type="number"
                                        label="Unit price"
                                        formControlName="unitPrice"
                                    />
                                    @if (canEdit()) {
                                        <div class="flex items-end sm:col-span-6">
                                            <app-button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                (clicked)="removeLineItem(i)"
                                            >
                                                Remove
                                            </app-button>
                                        </div>
                                    }
                                </div>
                            }
                        </div>
                    </div>

                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-input
                            id="quote-discount"
                            type="number"
                            label="Discount %"
                            formControlName="discountPercent"
                        />
                        <app-input
                            id="quote-tax"
                            type="number"
                            label="Tax %"
                            formControlName="taxPercent"
                        />
                    </div>

                    @if (quote(); as item) {
                        <div class="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                            <app-badge [variant]="statusVariant(item.status)">{{
                                formatStatus(item.status)
                            }}</app-badge>
                            <span class="text-sm text-muted-foreground">
                                Subtotal {{ formatCurrency(computedSubtotal(), item.currency) }}
                            </span>
                            <span class="text-sm font-semibold text-foreground">
                                Total {{ formatCurrency(item.total, item.currency) }}
                            </span>
                        </div>

                        @if (history().length > 0) {
                            <div class="space-y-2 border-t border-border pt-4">
                                <p class="text-sm font-medium">History</p>
                                @for (entry of history(); track entry.id) {
                                    <div class="rounded-md border px-3 py-2 text-sm">
                                        <p class="font-medium">{{ historyLabel(entry.action) }}</p>
                                        <p class="text-xs text-muted-foreground">
                                            {{ formatDate(entry.createdAt) }}
                                            @if (entry.user?.email) {
                                                · {{ entry.user.email }}
                                            }
                                        </p>
                                    </div>
                                }
                            </div>
                        }
                    }
                </form>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (quote()?.id && canManage()) {
                    <app-button variant="destructive" type="button" [disabled]="submitting()" (clicked)="deleteQuote()">
                        Delete
                    </app-button>
                }
                @if (quote()?.status === 'DRAFT' && canManage()) {
                    <app-button variant="secondary" type="button" [disabled]="submitting()" (clicked)="sendQuote()">
                        Send quote
                    </app-button>
                }
                @if (quote()?.status === 'SENT' && canManage()) {
                    <app-button variant="secondary" type="button" [disabled]="submitting()" (clicked)="acceptQuote()">
                        Mark accepted
                    </app-button>
                    <app-button variant="outline" type="button" [disabled]="submitting()" (clicked)="rejectQuote()">
                        Mark rejected
                    </app-button>
                }
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                @if (canEdit()) {
                    <app-button type="button" [disabled]="submitting() || loading()" (clicked)="save()">
                        @if (submitting()) {
                            <app-loader size="sm" [inline]="true" />
                        } @else {
                            Save quote
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class QuoteDetailDialogComponent implements OnInit {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly quoteService = inject(QuoteService);
    private readonly productService = inject(ProductService);
    private readonly dealService = inject(DealService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    readonly data = inject<QuoteDetailDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<QuoteDetailDialogResult>);

    readonly quote = signal<Quote | null>(null);
    readonly history = signal<QuoteHistoryEntry[]>([]);
    readonly products = signal<Product[]>([]);
    readonly dealOptions = signal<SelectOption[]>([]);
    readonly loading = signal(true);
    readonly submitting = signal(false);

    readonly formatStatus = formatEnterpriseStatus;
    readonly formatCurrency = formatEnterpriseCurrency;
    readonly formatDate = formatEnterpriseDate;
    readonly statusVariant = enterpriseStatusBadge;

    readonly form = this.fb.group({
        title: ['', Validators.required],
        quoteNumber: [''],
        dealId: [''],
        validUntil: [''],
        currency: ['USD'],
        notes: [''],
        discountPercent: [0],
        taxPercent: [0],
        lineItems: this.fb.array([]),
    });

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageDeals),
    );

    readonly canEdit = computed(() => {
        const status = this.quote()?.status ?? 'DRAFT';
        return this.canManage() && (!this.quote()?.id || status === 'DRAFT');
    });

    readonly dialogTitle = computed(() =>
        this.data.quoteId ? 'Quote details' : 'New quote',
    );

    get lineItems(): FormArray {
        return this.form.controls.lineItems;
    }

    readonly productOptions = computed<SelectOption[]>(() => [
        { value: '', label: 'Custom line' },
        ...this.products().map((product) => ({
            value: product.id,
            label: `${product.sku} — ${product.name}`,
        })),
    ]);

    ngOnInit(): void {
        void this.load();
    }

    computedSubtotal(): number {
        return this.lineItems.controls.reduce((sum, control) => {
            const qty = Number(control.get('quantity')?.value) || 0;
            const price = Number(control.get('unitPrice')?.value) || 0;
            return sum + qty * price;
        }, 0);
    }

    historyLabel(action: string): string {
        return HISTORY_LABELS[action] ?? action;
    }

    addLineItem(product?: Product): void {
        this.lineItems.push(
            this.fb.group({
                productId: [product?.id ?? ''],
                description: [product?.name ?? '', Validators.required],
                quantity: [1, [Validators.required, Validators.min(0.0001)]],
                unitPrice: [product?.unitPrice ?? 0, [Validators.required, Validators.min(0)]],
            }),
        );
    }

    removeLineItem(index: number): void {
        this.lineItems.removeAt(index);
    }

    close(): void {
        this.dialogRef.close();
    }

    private async load(): Promise<void> {
        this.loading.set(true);
        try {
            const [products, deals] = await Promise.all([
                this.productService.list({ page: 1, pageSize: 100, status: 'ACTIVE' }),
                this.dealService.listDeals({ page: 1, pageSize: 100 }),
            ]);

            this.products.set(products.data);
            this.dealOptions.set([
                { value: '', label: 'No deal' },
                ...deals.data.map((deal) => ({ value: deal.id, label: deal.title })),
            ]);

            if (this.data.quoteId) {
                const [quote, history] = await Promise.all([
                    this.quoteService.getById(this.data.quoteId),
                    this.quoteService.listHistory(this.data.quoteId),
                ]);
                if (quote) {
                    this.quote.set(quote);
                    this.history.set(history);
                    this.patchForm(quote);
                }
            } else {
                this.addLineItem();
            }
        } catch {
            this.toastService.show({
                title: 'Load failed',
                description: 'Could not load quote details.',
                variant: 'destructive',
            });
        } finally {
            this.loading.set(false);
        }
    }

    private patchForm(quote: Quote): void {
        this.lineItems.clear();
        for (const line of quote.lineItems ?? []) {
            this.lineItems.push(
                this.fb.group({
                    productId: [line.productId ?? ''],
                    description: [line.description, Validators.required],
                    quantity: [line.quantity, [Validators.required, Validators.min(0.0001)]],
                    unitPrice: [line.unitPrice, [Validators.required, Validators.min(0)]],
                }),
            );
        }

        this.form.patchValue({
            title: quote.title,
            quoteNumber: quote.quoteNumber ?? '',
            dealId: quote.dealId ?? '',
            validUntil: quote.validUntil?.slice(0, 10) ?? '',
            currency: quote.currency,
            notes: quote.notes ?? '',
            discountPercent: quote.discountPercent,
            taxPercent: quote.taxPercent,
        });

        if (!this.canEdit()) {
            this.form.disable();
        }
    }

    private buildPayload(): Record<string, unknown> {
        const value = this.form.getRawValue();
        const lines = value.lineItems as {
            productId: string;
            description: string;
            quantity: number | string;
            unitPrice: number | string;
        }[];

        return {
            title: value.title,
            dealId: value.dealId || undefined,
            validUntil: value.validUntil || undefined,
            currency: value.currency,
            notes: value.notes || undefined,
            discountPercent: Number(value.discountPercent) || 0,
            taxPercent: Number(value.taxPercent) || 0,
            lineItems: lines.map((line, index) => ({
                productId: line.productId || undefined,
                description: line.description,
                quantity: Number(line.quantity),
                unitPrice: Number(line.unitPrice),
                sortOrder: index,
            })),
        };
    }

    async save(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        try {
            const payload = this.buildPayload();
            const saved = this.data.quoteId
                ? await this.quoteService.update(this.data.quoteId, payload)
                : await this.quoteService.create(payload);

            if (saved) {
                this.quote.set(saved);
                this.toastService.success('Saved', 'Quote saved.');
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.show({
                title: 'Save failed',
                description: 'Could not save quote.',
                variant: 'destructive',
            });
        } finally {
            this.submitting.set(false);
        }
    }

    async sendQuote(): Promise<void> {
        const id = this.quote()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            const updated = await this.quoteService.send(id);
            if (updated) {
                this.quote.set(updated);
                this.toastService.success('Sent', 'Quote marked as sent.');
                this.dialogRef.close('updated');
            }
        } catch {
            this.toastService.show({
                title: 'Send failed',
                description: 'Could not send quote.',
                variant: 'destructive',
            });
        } finally {
            this.submitting.set(false);
        }
    }

    async acceptQuote(): Promise<void> {
        const id = this.quote()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            const updated = await this.quoteService.accept(id);
            if (updated) {
                this.quote.set(updated);
                this.toastService.success('Accepted', 'Quote marked as accepted.');
                this.dialogRef.close('updated');
            }
        } catch {
            this.toastService.show({
                title: 'Update failed',
                description: 'Could not accept quote.',
                variant: 'destructive',
            });
        } finally {
            this.submitting.set(false);
        }
    }

    async rejectQuote(): Promise<void> {
        const id = this.quote()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            const updated = await this.quoteService.reject(id);
            if (updated) {
                this.quote.set(updated);
                this.toastService.success('Rejected', 'Quote marked as rejected.');
                this.dialogRef.close('updated');
            }
        } catch {
            this.toastService.show({
                title: 'Update failed',
                description: 'Could not reject quote.',
                variant: 'destructive',
            });
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteQuote(): Promise<void> {
        const id = this.quote()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.quoteService.delete(id);
            this.toastService.success('Deleted', 'Quote removed.');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.show({
                title: 'Delete failed',
                description: 'Could not delete quote.',
                variant: 'destructive',
            });
        } finally {
            this.submitting.set(false);
        }
    }
}

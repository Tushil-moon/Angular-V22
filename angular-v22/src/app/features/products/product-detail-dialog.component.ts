/**
 * Product Detail Dialog — catalog item editor
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Product } from '@models/enterprise.model';
import { PermissionService, ProductService } from '@services/index';
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

import { formatEnterpriseStatus } from '../enterprise/enterprise-ui.util';

export interface ProductDetailDialogData {
    productId?: string;
}

export type ProductDetailDialogResult = 'saved' | 'deleted' | 'updated';

const STATUS_OPTIONS: SelectOption[] = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-product-detail-dialog',
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
            [title]="data.productId ? 'Product details' : 'New product'"
            description="Catalog items used on quote line items."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-4">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-input id="product-sku" label="SKU" formControlName="sku" [required]="true" />
                        <app-input id="product-name" label="Name" formControlName="name" [required]="true" />
                    </div>
                    <app-textarea id="product-description" label="Description" formControlName="description" />
                    <div class="grid gap-4 sm:grid-cols-3">
                        <app-input
                            id="product-price"
                            label="Unit price"
                            type="number"
                            formControlName="unitPrice"
                            [required]="true"
                        />
                        <app-input id="product-currency" label="Currency" formControlName="currency" [required]="true" />
                        <app-select
                            id="product-status"
                            label="Status"
                            formControlName="status"
                            [options]="statusOptions"
                        />
                    </div>
                    <app-input id="product-category" label="Category" formControlName="category" />

                    @if (product(); as item) {
                        <app-badge variant="secondary">{{ formatStatus(item.status) }}</app-badge>
                    }
                </form>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (product()?.id && canManage()) {
                    <app-button
                        variant="destructive"
                        type="button"
                        [disabled]="submitting()"
                        (clicked)="deleteProduct()"
                    >
                        Delete
                    </app-button>
                }
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                @if (canManage()) {
                    <app-button type="button" [disabled]="submitting() || loading()" (clicked)="save()">
                        @if (submitting()) {
                            <app-loader size="sm" [inline]="true" />
                        } @else {
                            Save product
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class ProductDetailDialogComponent implements OnInit {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly productService = inject(ProductService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    readonly data = inject<ProductDetailDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<ProductDetailDialogResult>);

    readonly statusOptions = STATUS_OPTIONS;
    readonly formatStatus = formatEnterpriseStatus;

    readonly product = signal<Product | null>(null);
    readonly loading = signal(true);
    readonly submitting = signal(false);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageDeals),
    );

    readonly form = this.fb.group({
        sku: ['', Validators.required],
        name: ['', Validators.required],
        description: [''],
        unitPrice: [0, Validators.required],
        currency: ['USD', Validators.required],
        category: [''],
        status: ['ACTIVE'],
    });

    ngOnInit(): void {
        void this.load();
    }

    close(): void {
        this.dialogRef.close();
    }

    private async load(): Promise<void> {
        this.loading.set(true);
        try {
            if (this.data.productId) {
                const item = await this.productService.getById(this.data.productId);
                this.product.set(item);
                if (item) {
                    this.form.patchValue({
                        sku: item.sku,
                        name: item.name,
                        description: item.description ?? '',
                        unitPrice: item.unitPrice,
                        currency: item.currency,
                        category: item.category ?? '',
                        status: item.status,
                    });
                }
            }
        } catch {
            this.toastService.error('Failed to load product');
        } finally {
            this.loading.set(false);
        }
    }

    async save(): Promise<void> {
        if (this.form.invalid) return;
        this.submitting.set(true);
        try {
            const raw = this.form.getRawValue();
            const payload = {
                sku: raw.sku,
                name: raw.name,
                description: raw.description || undefined,
                unitPrice: Number(raw.unitPrice),
                currency: raw.currency,
                category: raw.category || undefined,
                status: raw.status,
            };

            if (this.product()?.id) {
                await this.productService.update(this.product()!.id, payload);
                this.toastService.success('Product updated');
                this.dialogRef.close('updated');
            } else {
                await this.productService.create(payload);
                this.toastService.success('Product created');
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.error('Failed to save product');
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteProduct(): Promise<void> {
        const id = this.product()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.productService.delete(id);
            this.toastService.success('Product deleted');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.error('Failed to delete product');
        } finally {
            this.submitting.set(false);
        }
    }
}

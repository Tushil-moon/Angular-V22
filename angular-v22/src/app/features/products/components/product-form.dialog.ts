/**
 * Product add / edit — large dialog shell
 */

import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import {
    BadgeComponent,
    ButtonComponent,
    DialogComponent,
    IconComponent,
    LoaderComponent,
} from '@shared/components';
import { DialogRef } from '@shared/dialog/dialog-ref';
import { DIALOG_DATA } from '@shared/dialog/dialog.tokens';

import { ProductFormBodyComponent } from './product-form-body.component';

export interface ProductFormDialogData {
    productId?: string | null;
}

export type ProductFormDialogResult = 'saved';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-product-form-dialog',
    imports: [
        DialogComponent,
        ProductFormBodyComponent,
        ButtonComponent,
        IconComponent,
        BadgeComponent,
        LoaderComponent,
    ],
    template: `
        <app-dialog
            [title]="title()"
            [description]="description()"
            titleIcon="package"
            size="2xl"
            panelClass="dialog-panel-product"
            [showFooter]="true"
        >
            @if (body()?.isEdit() && body()?.isLoadingProduct()) {
                <div dialogHeaderExtra class="flex shrink-0 items-center pt-1">
                    <span
                        class="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                        Loading…
                    </span>
                </div>
            } @else if (body()?.isEdit() && body()?.loadedProduct(); as product) {
                <div dialogHeaderExtra class="flex shrink-0 items-center pt-1">
                    <app-badge [variant]="body()!.statusVariant(product.status)">
                        {{ product.status }}
                    </app-badge>
                </div>
            }

            <app-product-form-body
                #bodyRef
                [productId]="productId()"
                (saved)="onSaved()"
                (duplicated)="onSaved()"
            />

            <div
                dialogFooter
                class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
                <app-button type="button" variant="ghost" size="toolbar" (clicked)="cancel()">
                    Cancel
                </app-button>
                <div class="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                    @if (body()?.isEdit() && body()?.canManage()) {
                        <app-button
                            type="button"
                            variant="outline"
                            size="toolbar"
                            [disabled]="body()!.actionLoading()"
                            (clicked)="body()!.publishProduct()"
                        >
                            <app-icon name="check" [size]="14" />
                            Publish
                        </app-button>
                        <app-button
                            type="button"
                            variant="outline"
                            size="toolbar"
                            [disabled]="body()!.actionLoading()"
                            (clicked)="body()!.archiveProduct()"
                        >
                            <app-icon name="bookmark" [size]="14" />
                            Archive
                        </app-button>
                        <app-button
                            type="button"
                            variant="outline"
                            size="toolbar"
                            [disabled]="body()!.actionLoading()"
                            (clicked)="body()!.duplicateProduct()"
                        >
                            <app-icon name="layers" [size]="14" />
                            Duplicate
                        </app-button>
                    }
                    @if (body()?.canManage()) {
                        <app-button
                            type="button"
                            variant="primary"
                            size="toolbar"
                            [disabled]="body()?.saving() ?? false"
                            (clicked)="body()?.save()"
                        >
                            @if (body()?.saving()) {
                                <app-loader size="sm" [inline]="true" />
                                Saving…
                            } @else {
                                <app-icon name="plus-square" [size]="14" />
                                {{ body()?.submitLabel() ?? 'Save' }}
                            }
                        </app-button>
                    }
                </div>
            </div>
        </app-dialog>
    `,
})
export class ProductFormDialogComponent {
    readonly data = inject<ProductFormDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(
        DialogRef<ProductFormDialogComponent, ProductFormDialogResult | null>,
    );

    readonly body = viewChild<ProductFormBodyComponent>('bodyRef');

    readonly productId = computed(() => this.data.productId ?? null);
    readonly isEdit = computed(() => !!this.productId());

    readonly title = computed(() => (this.isEdit() ? 'Edit product' : 'Add product'));

    readonly description = computed(() =>
        this.isEdit()
            ? 'Update catalog details, pricing, categories, and images'
            : 'Set up a storefront-ready product with pricing, catalog, and media',
    );

    cancel(): void {
        this.dialogRef.close(null);
    }

    onSaved(): void {
        this.dialogRef.close('saved');
    }
}

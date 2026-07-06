import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import type { Product } from '@models/enterprise.model';
import { DialogService, ProductService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseCurrency } from '../enterprise/enterprise-list.util';
import {
    enterpriseStatusBadge,
    formatEnterpriseStatus,
} from '../enterprise/enterprise-ui.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-products-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            #shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [openDetailFn]="openDetailFn"
            [defaultView]="'cards'"
            listTitle="Product catalog"
        />
    `,
})
export class ProductsListComponent {
    private readonly productService = inject(ProductService);
    private readonly dialogService = inject(DialogService);
    private readonly shell = viewChild<EnterpriseListShellComponent<Product>>('shell');

    readonly config: EnterpriseListConfig<Product> = {
        title: 'Products',
        description: 'Product catalog for quote line items',
        entityLabel: 'product',
        cardTitle: (p) => p.name,
        cardSubtitle: (p) => `${p.sku} · ${formatEnterpriseCurrency(p.unitPrice, p.currency)}`,
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Active', value: 'ACTIVE' },
            { label: 'Inactive', value: 'INACTIVE' },
        ],
        detailStatus: (p) => ({
            text: formatEnterpriseStatus(p.status),
            variant: enterpriseStatusBadge(p.status),
        }),
        detailFields: (p) => [
            { label: 'SKU', value: p.sku },
            { label: 'Price', value: formatEnterpriseCurrency(p.unitPrice, p.currency) },
            { label: 'Category', value: p.category ?? '—' },
            { label: 'Description', value: p.description ?? '—' },
        ],
        columns: [
            { key: 'sku', label: 'SKU', cell: (p) => p.sku },
            { key: 'name', label: 'Name', cell: (p) => p.name },
            {
                key: 'status',
                label: 'Status',
                cell: (p) => formatEnterpriseStatus(p.status),
                badge: (p) => ({
                    text: formatEnterpriseStatus(p.status),
                    variant: enterpriseStatusBadge(p.status),
                }),
            },
            {
                key: 'unitPrice',
                label: 'Unit price',
                cell: (p) => formatEnterpriseCurrency(p.unitPrice, p.currency),
            },
            {
                key: 'category',
                label: 'Category',
                cell: (p) => p.category ?? '—',
                hideBelow: 'md',
            },
        ],
    };

    readonly listFn = (filters: Parameters<ProductService['list']>[0]) =>
        this.productService.list(filters);

    readonly createFn = async () => {
        await this.openProductDialog();
        return null;
    };

    readonly deleteFn = (id: string) => this.productService.delete(id);

    readonly openDetailFn = (item: Product) => this.openProductDialog(item.id);

    private async openProductDialog(productId?: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./product-detail-dialog.component').ProductDetailDialogComponent,
            import('./product-detail-dialog.component').ProductDetailDialogData,
            import('./product-detail-dialog.component').ProductDetailDialogResult
        >(
            () =>
                import('./product-detail-dialog.component').then(
                    (m) => m.ProductDetailDialogComponent,
                ),
            { data: { productId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.shell()?.reload();
        });
    }
}

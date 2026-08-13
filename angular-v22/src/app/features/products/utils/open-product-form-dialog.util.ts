/**
 * Opens the product add/edit dialog and streams its result.
 */

import type { DialogService } from '@services/dialog.service';
import { map, Observable } from 'rxjs';

import {
    ProductFormDialogComponent,
    type ProductFormDialogData,
    type ProductFormDialogResult,
} from '../components/product-form.dialog';

export function openProductFormDialog(
    dialog: DialogService,
    productId?: string | null,
): Observable<ProductFormDialogResult | null> {
    return dialog
        .open<ProductFormDialogComponent, ProductFormDialogData, ProductFormDialogResult | null>(
            ProductFormDialogComponent,
            {
                data: { productId: productId ?? null },
                maxWidth: '98vw',
            },
        )
        .afterClosed()
        .pipe(map((result) => result ?? null));
}

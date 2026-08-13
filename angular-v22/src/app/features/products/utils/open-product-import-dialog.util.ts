/**
 * Opens the bulk product import dialog.
 */

import type { DialogService } from '@services/dialog.service';
import { map, Observable } from 'rxjs';

import {
    ProductImportDialogComponent,
    type ProductImportDialogResult,
} from '../components/product-import.dialog';

export function openProductImportDialog(
    dialog: DialogService,
): Observable<ProductImportDialogResult | null> {
    return dialog
        .open<ProductImportDialogComponent, undefined, ProductImportDialogResult | null>(
            ProductImportDialogComponent,
            {
                maxWidth: '98vw',
            },
        )
        .afterClosed()
        .pipe(map((result) => result ?? null));
}

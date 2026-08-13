/**
 * Opens the brand add/edit dialog and streams its result.
 */

import type { DialogService } from '@services/dialog.service';
import { map, Observable } from 'rxjs';

import {
    BrandFormDialogComponent,
    type BrandFormDialogData,
    type BrandFormDialogResult,
} from '../components/brand-form.dialog';

export function openBrandFormDialog(
    dialog: DialogService,
    brandId?: string | null,
): Observable<BrandFormDialogResult | null> {
    return dialog
        .open<BrandFormDialogComponent, BrandFormDialogData, BrandFormDialogResult | null>(
            BrandFormDialogComponent,
            {
                data: { brandId: brandId ?? null },
                maxWidth: '40rem',
            },
        )
        .afterClosed()
        .pipe(map((result) => result ?? null));
}

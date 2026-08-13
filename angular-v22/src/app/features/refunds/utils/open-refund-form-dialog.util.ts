/**
 * Opens the refund request dialog and streams its result.
 */

import type { DialogService } from '@services/dialog.service';
import { map, Observable } from 'rxjs';

import {
    RefundFormDialogComponent,
    type RefundFormDialogData,
    type RefundFormDialogResult,
} from '../components/refund-form.dialog';

export function openRefundFormDialog(
    dialog: DialogService,
    data: RefundFormDialogData = {},
): Observable<RefundFormDialogResult | null> {
    return dialog
        .open<RefundFormDialogComponent, RefundFormDialogData, RefundFormDialogResult | null>(
            RefundFormDialogComponent,
            {
                data,
                maxWidth: '40rem',
            },
        )
        .afterClosed()
        .pipe(map((result) => result ?? null));
}

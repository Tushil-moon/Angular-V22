/**
 * Opens the collection add/edit dialog and streams its result.
 */

import type { DialogService } from '@services/dialog.service';
import { map, Observable } from 'rxjs';

import {
    CollectionFormDialogComponent,
    type CollectionFormDialogData,
    type CollectionFormDialogResult,
} from '../components/collection-form.dialog';

export function openCollectionFormDialog(
    dialog: DialogService,
    collectionId?: string | null,
): Observable<CollectionFormDialogResult | null> {
    return dialog
        .open<
            CollectionFormDialogComponent,
            CollectionFormDialogData,
            CollectionFormDialogResult | null
        >(CollectionFormDialogComponent, {
            data: { collectionId: collectionId ?? null },
            maxWidth: '40rem',
        })
        .afterClosed()
        .pipe(map((result) => result ?? null));
}

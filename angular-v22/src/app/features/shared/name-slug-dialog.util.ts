/**
 * Opens the shared name/slug/code dialog and streams its result.
 */

import type { DialogService } from '@services/dialog.service';
import { map, Observable } from 'rxjs';

import {
    type NameSlugFormData,
    NameSlugFormDialogComponent,
    type NameSlugFormResult,
} from './name-slug-form.dialog';

export function openNameSlugDialog(
    dialog: DialogService,
    data: NameSlugFormData,
): Observable<NameSlugFormResult | null> {
    const dialogRef = dialog.open<
        NameSlugFormDialogComponent,
        NameSlugFormData,
        NameSlugFormResult | null
    >(NameSlugFormDialogComponent, { data, maxWidth: '95vw' });

    return dialogRef.afterClosed().pipe(map((result) => result ?? null));
}

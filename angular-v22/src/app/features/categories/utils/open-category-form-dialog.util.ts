/**
 * Opens the category add/edit dialog and streams its result.
 */

import type { DialogService } from '@services/dialog.service';
import { map, Observable } from 'rxjs';

import {
    CategoryFormDialogComponent,
    type CategoryFormDialogData,
    type CategoryFormDialogResult,
} from '../components/category-form.dialog';

export function openCategoryFormDialog(
    dialog: DialogService,
    categoryId?: string | null,
): Observable<CategoryFormDialogResult | null> {
    return dialog
        .open<CategoryFormDialogComponent, CategoryFormDialogData, CategoryFormDialogResult | null>(
            CategoryFormDialogComponent,
            {
                data: { categoryId: categoryId ?? null },
                maxWidth: '40rem',
            },
        )
        .afterClosed()
        .pipe(map((result) => result ?? null));
}

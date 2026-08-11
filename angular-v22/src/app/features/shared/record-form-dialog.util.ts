/**
 * Opens the generic record form dialog and streams its result.
 */

import type { DialogService } from '@services/dialog.service';
import { map, Observable } from 'rxjs';

import {
    type RecordFormData,
    RecordFormDialogComponent,
    type RecordFormResult,
} from './record-form.dialog';

export function openRecordFormDialog(
    dialog: DialogService,
    data: RecordFormData,
): Observable<RecordFormResult | null> {
    return dialog
        .open<RecordFormDialogComponent, RecordFormData, RecordFormResult | null>(
            RecordFormDialogComponent,
            { data, maxWidth: '95vw' },
        )
        .afterClosed()
        .pipe(map((result) => result ?? null));
}

/** Returns the trimmed value or `undefined` so optional API fields stay omitted. */
export function optionalValue(result: RecordFormResult, key: string): string | undefined {
    const value = result[key]?.trim();
    return value ? value : undefined;
}

/** Parses a numeric dialog field, returning `undefined` when blank or invalid. */
export function optionalNumber(result: RecordFormResult, key: string): number | undefined {
    const value = optionalValue(result, key);
    if (value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

/** Parses a date dialog field into an ISO string the backend can coerce. */
export function optionalIsoDate(result: RecordFormResult, key: string): string | undefined {
    const value = optionalValue(result, key);
    if (value === undefined) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

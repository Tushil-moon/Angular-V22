/**
 * Shared helpers for when to show field-level validation errors.
 * Errors are hidden on initial visit; shown after blur (touched) or submit.
 */

export interface FieldDisplayState {
    touched: boolean;
    submitted: boolean;
}

export function shouldShowFieldError(state: FieldDisplayState): boolean {
    return state.touched || state.submitted;
}

export function resolveFieldError(error: string | null | undefined, show: boolean): string | null {
    if (!show || !error) {
        return null;
    }
    return error;
}

export function clearFieldFromErrors(
    errors: Record<string, string[]>,
    field: string,
): Record<string, string[]> {
    if (!(field in errors)) {
        return errors;
    }
    const next = { ...errors };
    delete next[field];
    return next;
}

export function addTouchedField(touched: Set<string>, field: string): Set<string> {
    if (touched.has(field)) {
        return touched;
    }
    const next = new Set(touched);
    next.add(field);
    return next;
}

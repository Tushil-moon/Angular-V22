/**
 * Reusable name (+ optional slug/code) create/edit dialog for simple admin entities.
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import {
    ButtonComponent,
    DialogComponent,
    InputComponent,
    SubmitButtonComponent,
} from '@shared/components';
import { DialogRef } from '@shared/dialog/dialog-ref';
import { DIALOG_DATA } from '@shared/dialog/dialog.tokens';

export interface NameSlugFormData {
    title: string;
    description?: string;
    submitLabel?: string;
    name?: string;
    slug?: string;
    code?: string;
    nameLabel?: string;
    namePlaceholder?: string;
    showSlug?: boolean;
    showCode?: boolean;
    codeLabel?: string;
    codePlaceholder?: string;
    codeRequired?: boolean;
    nameHint?: string;
}

export interface NameSlugFormResult {
    name: string;
    slug?: string;
    code?: string;
}

function toSlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-name-slug-form-dialog',
    imports: [FormField, DialogComponent, InputComponent, ButtonComponent, SubmitButtonComponent],
    template: `
        <app-dialog
            [title]="data.title"
            [description]="data.description ?? ''"
            [showFooter]="false"
            size="default"
        >
            <form class="dialog-form" (submit)="onSubmit($event)">
                <app-input
                    id="ns-name"
                    [label]="data.nameLabel ?? 'Name'"
                    [placeholder]="data.namePlaceholder ?? ''"
                    [hint]="data.nameHint ?? ''"
                    [formField]="entityForm.name"
                    [required]="true"
                    [error]="nameError()"
                    autocomplete="off"
                />
                @if (data.showSlug !== false) {
                    <app-input
                        id="ns-slug"
                        label="Slug"
                        placeholder="auto-generated-from-name"
                        hint="Leave blank to generate from the name"
                        [formField]="entityForm.slug"
                        autocomplete="off"
                    />
                }
                @if (data.showCode) {
                    <app-input
                        id="ns-code"
                        [label]="data.codeLabel ?? 'Code'"
                        [placeholder]="data.codePlaceholder ?? ''"
                        [formField]="entityForm.code"
                        [required]="!!data.codeRequired"
                        [error]="codeError()"
                        autocomplete="off"
                    />
                }

                <div class="dialog-form-actions">
                    <app-button type="button" variant="outline" (clicked)="cancel()">
                        Cancel
                    </app-button>
                    <app-submit-button
                        [label]="data.submitLabel ?? 'Save'"
                        loadingLabel="Saving..."
                        [loading]="saving()"
                        [disabled]="!canSubmit()"
                    />
                </div>
            </form>
        </app-dialog>
    `,
})
export class NameSlugFormDialogComponent {
    readonly data = inject<NameSlugFormData>(DIALOG_DATA);
    private readonly dialogRef = inject(
        DialogRef<NameSlugFormDialogComponent, NameSlugFormResult | null>,
    );

    readonly saving = signal(false);
    readonly submitted = signal(false);

    readonly model = signal({
        name: this.data.name ?? '',
        slug: this.data.slug ?? '',
        code: this.data.code ?? '',
    });

    readonly entityForm = form(this.model);

    readonly nameError = computed(() => {
        if (!this.submitted()) return null;
        return this.model().name.trim() ? null : `${this.data.nameLabel ?? 'Name'} is required`;
    });

    readonly codeError = computed(() => {
        if (!this.submitted() || !this.data.codeRequired) return null;
        return this.model().code.trim() ? null : `${this.data.codeLabel ?? 'Code'} is required`;
    });

    canSubmit(): boolean {
        const nameOk = this.model().name.trim().length > 0;
        const codeOk = !this.data.codeRequired || this.model().code.trim().length > 0;
        return nameOk && codeOk;
    }

    cancel(): void {
        this.dialogRef.close(null);
    }

    onSubmit(event: Event): void {
        event.preventDefault();
        this.submitted.set(true);
        if (!this.canSubmit() || this.saving()) return;
        this.saving.set(true);
        const name = this.model().name.trim();
        let slug = this.model().slug.trim();
        if (this.data.showSlug !== false && !slug) {
            slug = toSlug(name);
        }
        this.dialogRef.close({
            name,
            slug: this.data.showSlug === false ? undefined : slug,
            code: this.data.showCode ? this.model().code.trim() || undefined : undefined,
        });
    }
}

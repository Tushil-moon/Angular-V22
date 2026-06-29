/**
 * Sticky note editor dialog — rich text + color + pin
 */

import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import type { StickyNote } from '@models/sticky-note.model';
import { STICKY_NOTE_COLORS } from '@models/sticky-note.model';
import { PermissionService, StickyNoteService } from '@services/index';
import { ToastService } from '@services/toast.service';
import { ButtonComponent } from '@shared/components/button.component';
import { DialogComponent } from '@shared/components/dialog.component';
import { IconComponent } from '@shared/components/icon.component';
import { InputComponent } from '@shared/components/input.component';
import { RichTextEditorComponent } from '@shared/components/rich-text-editor.component';
import { DialogRef, DIALOG_DATA } from '@shared/dialog';
import { Permissions } from '@shared/constants/permissions';
import { sanitizeRichHtml } from '@utils/rich-text.util';

export interface StickyNoteEditorDialogData {
    note?: StickyNote;
}

export type StickyNoteEditorDialogResult = 'saved' | 'deleted';

@Component({
    selector: 'app-sticky-note-editor-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        IconComponent,
        InputComponent,
        RichTextEditorComponent,
    ],
    template: `
        <app-dialog
            [title]="isEdit() ? 'Edit note' : 'New note'"
            description="Format text, pick a color, and pin important notes."
            size="lg"
        >
            <form [formGroup]="form" class="space-y-4" (ngSubmit)="save()">
                <app-input
                    id="note-title"
                    label="Title"
                    formControlName="title"
                    placeholder="Note title (optional)"
                />

                <div class="space-y-2">
                    <p class="text-sm font-medium text-foreground">Content</p>
                    <app-rich-text-editor formControlName="content" placeholder="Write your note…" />
                </div>

                @if (canManage()) {
                    <div class="space-y-2">
                        <p class="text-sm font-medium text-foreground">Color</p>
                        <div class="flex flex-wrap gap-2">
                            @for (swatch of colors; track swatch.id) {
                                <button
                                    type="button"
                                    class="sticky-color-swatch"
                                    [class.sticky-color-swatch-active]="form.controls.color.value === swatch.value"
                                    [style.background-color]="swatch.value"
                                    [attr.aria-label]="swatch.label"
                                    (click)="form.controls.color.setValue(swatch.value)"
                                ></button>
                            }
                        </div>
                    </div>

                    <label class="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="checkbox" formControlName="isPinned" class="checkbox" />
                        <app-icon name="pin" [size]="14" />
                        Pin to top
                    </label>
                }
            </form>

            <div dialogFooter class="flex w-full items-center justify-between gap-2">
                @if (isEdit() && canManage()) {
                    <app-button
                        type="button"
                        variant="destructive"
                        [disabled]="saving()"
                        (clicked)="remove()"
                    >
                        Delete
                    </app-button>
                } @else {
                    <span></span>
                }
                <div class="flex gap-2">
                    <app-button type="button" variant="outline" (clicked)="close()">
                        {{ canManage() ? 'Cancel' : 'Close' }}
                    </app-button>
                    @if (canManage()) {
                        <app-button type="button" [disabled]="saving()" (clicked)="save()">
                            @if (saving()) {
                                Saving…
                            } @else {
                                Save note
                            }
                        </app-button>
                    }
                </div>
            </div>
        </app-dialog>
    `,
    styles: `
        .sticky-color-swatch {
            @apply h-8 w-8 rounded-full border-2 border-transparent ring-offset-background transition-transform
                hover:scale-105;
        }

        .sticky-color-swatch-active {
            @apply border-foreground ring-2 ring-ring ring-offset-2;
        }

        .checkbox {
            @apply size-4 rounded border border-input accent-primary;
        }
    `,
})
export class StickyNoteEditorDialogComponent {
    private readonly dialogRef = inject(DialogRef<StickyNoteEditorDialogResult>);
    private readonly data = inject<StickyNoteEditorDialogData>(DIALOG_DATA);
    private readonly stickyNoteService = inject(StickyNoteService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(FormBuilder);

    readonly colors = STICKY_NOTE_COLORS;
    readonly saving = signal(false);
    readonly isEdit = signal(Boolean(this.data.note?.id));
    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageActivities),
    );

    readonly form = this.fb.nonNullable.group({
        title: this.data.note?.title ?? '',
        content: this.data.note?.content ?? '',
        color: this.data.note?.color ?? STICKY_NOTE_COLORS[0].value,
        isPinned: this.data.note?.isPinned ?? false,
    });

    constructor() {
        if (!this.permissionService.hasPermission(Permissions.ManageActivities)) {
            this.form.disable();
        }
    }

    close(): void {
        this.dialogRef.close();
    }

    async save(): Promise<void> {
        this.saving.set(true);
        const payload = {
            title: this.form.controls.title.value.trim() || null,
            content: sanitizeRichHtml(this.form.controls.content.value),
            color: this.form.controls.color.value,
            isPinned: this.form.controls.isPinned.value,
        };

        try {
            if (this.data.note?.id) {
                await this.stickyNoteService.update(this.data.note.id, payload);
            } else {
                await this.stickyNoteService.create(payload);
            }
            this.toastService.success('Note saved', 'Your sticky note was saved.');
            this.dialogRef.close('saved');
        } catch {
            this.toastService.show({
                title: 'Save failed',
                description: 'Could not save this note.',
                variant: 'destructive',
            });
        } finally {
            this.saving.set(false);
        }
    }

    async remove(): Promise<void> {
        if (!this.data.note?.id || !window.confirm('Delete this note?')) return;
        this.saving.set(true);
        try {
            await this.stickyNoteService.delete(this.data.note.id);
            this.toastService.success('Note deleted', 'Sticky note removed.');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.show({
                title: 'Delete failed',
                description: 'Could not delete this note.',
                variant: 'destructive',
            });
        } finally {
            this.saving.set(false);
        }
    }
}

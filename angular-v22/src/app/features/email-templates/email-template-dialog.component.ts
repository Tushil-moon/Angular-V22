/**
 * Email Template Dialog
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { EmailTemplate } from '@models/enterprise.model';
import { EmailTemplateService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    BadgeComponent,
    ButtonComponent,
    DialogComponent,
    InputComponent,
    LoaderComponent,
    TextareaComponent,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';

export interface EmailTemplateDialogData {
    templateId?: string;
}

export type EmailTemplateDialogResult = 'saved' | 'deleted' | 'updated';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-email-template-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        LoaderComponent,
        InputComponent,
        TextareaComponent,
        BadgeComponent,
    ],
    template: `
        <app-dialog
            [title]="data.templateId ? 'Edit template' : 'New template'"
            description="Reusable email content for campaigns and sequences."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-4">
                    <app-input id="template-name" label="Name" formControlName="name" [required]="true" />
                    <app-input id="template-subject" label="Subject" formControlName="subject" [required]="true" />
                    <app-input id="template-category" label="Category" formControlName="category" />
                    <app-input id="template-preview" label="Preview text" formControlName="previewText" />
                    <app-textarea
                        id="template-body"
                        label="HTML body"
                        formControlName="bodyHtml"
                        [required]="true"
                    />

                    @if (template(); as item) {
                        <app-badge [variant]="item.active ? 'default' : 'secondary'">
                            {{ item.active ? 'Active' : 'Inactive' }}
                        </app-badge>
                    }
                </form>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (template()?.id && canManage()) {
                    <app-button
                        variant="destructive"
                        type="button"
                        [disabled]="submitting()"
                        (clicked)="deleteTemplate()"
                    >
                        Delete
                    </app-button>
                }
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                @if (canManage()) {
                    <app-button type="button" [disabled]="submitting() || loading()" (clicked)="save()">
                        @if (submitting()) {
                            <app-loader size="sm" [inline]="true" />
                        } @else {
                            Save template
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class EmailTemplateDialogComponent implements OnInit {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly emailTemplateService = inject(EmailTemplateService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    readonly data = inject<EmailTemplateDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<EmailTemplateDialogResult>);

    readonly template = signal<EmailTemplate | null>(null);
    readonly loading = signal(true);
    readonly submitting = signal(false);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageContacts),
    );

    readonly form = this.fb.group({
        name: ['', Validators.required],
        subject: ['', Validators.required],
        category: [''],
        previewText: [''],
        bodyHtml: ['', Validators.required],
    });

    ngOnInit(): void {
        void this.load();
    }

    close(): void {
        this.dialogRef.close();
    }

    private async load(): Promise<void> {
        this.loading.set(true);
        try {
            if (this.data.templateId) {
                const item = await this.emailTemplateService.getById(this.data.templateId);
                this.template.set(item);
                if (item) {
                    this.form.patchValue({
                        name: item.name,
                        subject: item.subject,
                        category: item.category ?? '',
                        previewText: item.previewText ?? '',
                        bodyHtml: item.bodyHtml,
                    });
                }
            }
        } catch {
            this.toastService.error('Failed to load template');
        } finally {
            this.loading.set(false);
        }
    }

    async save(): Promise<void> {
        if (this.form.invalid) return;
        this.submitting.set(true);
        try {
            const raw = this.form.getRawValue();
            const payload = {
                name: raw.name,
                subject: raw.subject,
                category: raw.category || undefined,
                previewText: raw.previewText || undefined,
                bodyHtml: raw.bodyHtml,
            };

            if (this.template()?.id) {
                await this.emailTemplateService.update(this.template()!.id, payload);
                this.toastService.success('Template updated');
                this.dialogRef.close('updated');
            } else {
                await this.emailTemplateService.create(payload);
                this.toastService.success('Template created');
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.error('Failed to save template');
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteTemplate(): Promise<void> {
        const id = this.template()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.emailTemplateService.delete(id);
            this.toastService.success('Template deleted');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.error('Failed to delete template');
        } finally {
            this.submitting.set(false);
        }
    }
}

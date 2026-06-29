/**
 * Company Detail Dialog — view, edit, delete
 */

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Company } from '@models/index';
import { CompanyService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    DialogComponent,
    InputComponent,
    LoaderComponent,
    TextareaComponent,
} from '@shared/components';
import { formatCompanyDate } from '@shared/config/companies-table.config';
import { Permissions } from '@shared/constants/permissions';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';
import { safeValidate, updateCompanySchema } from '@utils/validators';

export interface CompanyDetailDialogData {
    companyId: string;
}

export type CompanyDetailDialogResult = 'deleted' | 'updated';

type DialogMode = 'view' | 'edit' | 'delete';

@Component({
    selector: 'app-company-detail-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        LoaderComponent,
        InputComponent,
        TextareaComponent,
    ],
    template: `
        <app-dialog
            [title]="dialogTitle()"
            [description]="dialogDescription()"
            size="lg"
            [showFooter]="true"
        >
            @if (mode() === 'delete') {
                <p class="text-sm text-muted-foreground">
                    Delete
                    <span class="font-medium text-foreground">{{ company()?.name }}</span
                    >? Contacts will remain but lose this company link.
                </p>
            } @else if (isLoading()) {
                <div class="dialog-loading">
                    <app-loader />
                </div>
            } @else if (company(); as item) {
                @if (mode() === 'edit') {
                    <form [formGroup]="editForm" class="space-y-4">
                        <app-input
                            id="edit-name"
                            label="Company name"
                            formControlName="name"
                            [error]="fieldError('name')"
                        />
                        <div class="grid gap-4 sm:grid-cols-2">
                            <app-input id="edit-domain" label="Domain" formControlName="domain" />
                            <app-input
                                id="edit-industry"
                                label="Industry"
                                formControlName="industry"
                            />
                        </div>
                        <div class="grid gap-4 sm:grid-cols-2">
                            <app-input id="edit-size" label="Size" formControlName="size" />
                            <app-input id="edit-website" label="Website" formControlName="website" />
                        </div>
                        <app-input id="edit-address" label="Address" formControlName="address" />
                        <app-textarea id="edit-notes" label="Notes" formControlName="notes" />
                    </form>
                } @else {
                    <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="space-y-1">
                            <dt class="text-xs font-medium text-muted-foreground">Domain</dt>
                            <dd class="text-sm">{{ item.domain || '—' }}</dd>
                        </div>
                        <div class="space-y-1">
                            <dt class="text-xs font-medium text-muted-foreground">Industry</dt>
                            <dd class="text-sm">{{ item.industry || '—' }}</dd>
                        </div>
                        <div class="space-y-1">
                            <dt class="text-xs font-medium text-muted-foreground">Website</dt>
                            <dd class="text-sm">{{ item.website || '—' }}</dd>
                        </div>
                        <div class="space-y-1">
                            <dt class="text-xs font-medium text-muted-foreground">Contacts</dt>
                            <dd class="text-sm tabular-nums">{{ item.contactCount ?? 0 }}</dd>
                        </div>
                        <div class="space-y-1 sm:col-span-2">
                            <dt class="text-xs font-medium text-muted-foreground">Address</dt>
                            <dd class="text-sm">{{ item.address || '—' }}</dd>
                        </div>
                        @if (item.notes) {
                            <div class="space-y-1 sm:col-span-2">
                                <dt class="text-xs font-medium text-muted-foreground">Notes</dt>
                                <dd class="text-sm whitespace-pre-wrap">{{ item.notes }}</dd>
                            </div>
                        }
                        <div class="space-y-1">
                            <dt class="text-xs font-medium text-muted-foreground">Owner</dt>
                            <dd class="text-sm">{{ item.owner?.email || '—' }}</dd>
                        </div>
                        <div class="space-y-1">
                            <dt class="text-xs font-medium text-muted-foreground">Created</dt>
                            <dd class="text-sm">{{ formatDate(item.createdAt) }}</dd>
                        </div>
                    </dl>
                }
            }

            <div dialogFooter>
                @if (mode() === 'delete') {
                    <app-button variant="outline" type="button" (clicked)="setMode('view')"
                        >Cancel</app-button
                    >
                    <app-button
                        variant="destructive"
                        type="button"
                        [disabled]="isSubmitting()"
                        (clicked)="confirmDelete()"
                    >
                        Delete company
                    </app-button>
                } @else if (mode() === 'edit') {
                    <app-button variant="outline" type="button" (clicked)="setMode('view')"
                        >Cancel</app-button
                    >
                    <app-button type="button" [disabled]="isSubmitting()" (clicked)="saveEdit()">
                        Save changes
                    </app-button>
                } @else if (canManage()) {
                    <app-button variant="outline" type="button" (clicked)="setMode('edit')"
                        >Edit</app-button
                    >
                    <app-button
                        variant="destructive"
                        type="button"
                        (clicked)="setMode('delete')"
                    >
                        Delete
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class CompanyDetailDialogComponent implements OnInit {
    private readonly companyService = inject(CompanyService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly dialogRef = inject(
        DialogRef<CompanyDetailDialogComponent, CompanyDetailDialogResult>,
    );
    private readonly data = inject<CompanyDetailDialogData>(DIALOG_DATA);

    readonly formatDate = formatCompanyDate;

    company = signal<Company | null>(null);
    mode = signal<DialogMode>('view');
    isLoading = signal(true);
    isSubmitting = signal(false);
    fieldErrors = signal<Record<string, string[]>>({});

    editForm = this.fb.group({
        name: [''],
        domain: [''],
        industry: [''],
        size: [''],
        website: [''],
        address: [''],
        notes: [''],
    });

    canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageCompanies),
    );

    dialogTitle = computed(() => {
        if (this.mode() === 'delete') return 'Delete company';
        if (this.mode() === 'edit') return 'Edit company';
        return this.company()?.name ?? 'Company';
    });

    dialogDescription = computed(() => {
        if (this.mode() === 'delete') return 'This action cannot be undone.';
        if (this.mode() === 'edit') return 'Update company details.';
        return 'Company account details';
    });

    ngOnInit(): void {
        void this.loadCompany();
    }

    async loadCompany(): Promise<void> {
        this.isLoading.set(true);
        try {
            const company = await this.companyService.getCompanyById(this.data.companyId);
            this.company.set(company);
            if (company) this.patchEditForm(company);
        } finally {
            this.isLoading.set(false);
        }
    }

    setMode(next: DialogMode): void {
        this.mode.set(next);
        if (next === 'edit' && this.company()) {
            this.patchEditForm(this.company()!);
        }
    }

    fieldError(field: string): string | null {
        return this.fieldErrors()[field]?.[0] ?? null;
    }

    async saveEdit(): Promise<void> {
        const company = this.company();
        if (!company) return;

        const raw = this.editForm.getRawValue();
        const payload = {
            name: raw.name.trim() || undefined,
            domain: raw.domain.trim() || undefined,
            industry: raw.industry.trim() || undefined,
            size: raw.size.trim() || undefined,
            website: raw.website.trim() || undefined,
            address: raw.address.trim() || undefined,
            notes: raw.notes.trim() || undefined,
        };

        const validation = safeValidate(updateCompanySchema, payload);
        if (!validation.success) {
            this.fieldErrors.set(validation.errors ?? {});
            return;
        }

        this.fieldErrors.set({});
        this.isSubmitting.set(true);
        try {
            const updated = await this.companyService.updateCompany(company.id, validation.data);
            if (updated) {
                this.company.set(updated);
                this.toastService.success('Company updated', 'Changes saved.');
                this.dialogRef.close('updated');
            }
        } catch {
            this.toastService.show({
                title: 'Update failed',
                description: 'Could not save company.',
                variant: 'destructive',
            });
        } finally {
            this.isSubmitting.set(false);
        }
    }

    async confirmDelete(): Promise<void> {
        const company = this.company();
        if (!company) return;

        this.isSubmitting.set(true);
        try {
            await this.companyService.deleteCompany(company.id);
            this.toastService.success('Company deleted', `${company.name} was removed.`);
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.show({
                title: 'Delete failed',
                description: 'Could not delete company.',
                variant: 'destructive',
            });
        } finally {
            this.isSubmitting.set(false);
        }
    }

    private patchEditForm(company: Company): void {
        this.editForm.patchValue({
            name: company.name,
            domain: company.domain ?? '',
            industry: company.industry ?? '',
            size: company.size ?? '',
            website: company.website ?? '',
            address: company.address ?? '',
            notes: company.notes ?? '',
        });
    }
}

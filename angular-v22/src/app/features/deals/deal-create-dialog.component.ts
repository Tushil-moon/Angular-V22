/**
 * Deal Create Dialog
 */

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Contact, DEAL_STAGE_LABELS, DealStage } from '@models/index';
import { ContactService, DealService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    DialogComponent,
    InputComponent,
    LoaderComponent,
    SelectComponent,
    SelectOption,
    TextareaComponent,
} from '@shared/components';
import { DialogRef } from '@shared/dialog';
import { createDealSchema, safeValidate } from '@utils/validators';

export type DealCreateDialogResult = 'created';

const STAGE_OPTIONS = Object.entries(DEAL_STAGE_LABELS) as [DealStage, string][];

@Component({
    selector: 'app-deal-create-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        InputComponent,
        LoaderComponent,
        SelectComponent,
        TextareaComponent,
    ],
    template: `
        <app-dialog title="Create deal" description="Add a new opportunity to your pipeline.">
            <form
                id="deal-create-form"
                [formGroup]="form"
                (ngSubmit)="onSubmit()"
                class="space-y-4"
            >
                <app-input
                    id="deal-title"
                    label="Deal title"
                    formControlName="title"
                    [error]="fieldError('title')"
                    [required]="true"
                />
                <div class="grid gap-4 sm:grid-cols-2">
                    <app-input
                        id="deal-value"
                        type="number"
                        label="Value"
                        formControlName="value"
                        [error]="fieldError('value')"
                        [required]="true"
                    />
                    <app-input id="deal-currency" label="Currency" formControlName="currency" />
                </div>
                <app-select
                    id="deal-stage"
                    label="Stage"
                    formControlName="stage"
                    [options]="stageSelectOptions"
                />
                <app-select
                    id="deal-contact"
                    label="Contact"
                    formControlName="contactId"
                    placeholder="No contact"
                    [options]="contactSelectOptions()"
                />
                <app-input
                    id="deal-close-date"
                    type="date"
                    label="Expected close date"
                    formControlName="expectedCloseDate"
                />
                <app-input
                    id="deal-tags"
                    label="Tags"
                    formControlName="tags"
                    placeholder="priority, renewal (comma separated)"
                />
                <app-textarea
                    id="deal-description"
                    label="Description"
                    formControlName="description"
                />
            </form>

            <div dialogFooter>
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                <app-button type="submit" form="deal-create-form" [disabled]="isSubmitting()">
                    @if (isSubmitting()) {
                        <app-loader size="sm" [inline]="true" />
                    } @else {
                        Create deal
                    }
                </app-button>
            </div>
        </app-dialog>
    `,
})
export class DealCreateDialogComponent implements OnInit {
    private readonly dealService = inject(DealService);
    private readonly contactService = inject(ContactService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly dialogRef = inject(
        DialogRef<DealCreateDialogComponent, DealCreateDialogResult>,
    );

    readonly stageOptions = STAGE_OPTIONS;
    readonly stageSelectOptions: SelectOption[] = STAGE_OPTIONS.map(([value, label]) => ({
        value,
        label,
    }));
    contacts = signal<Contact[]>([]);
    readonly contactSelectOptions = computed<SelectOption[]>(() => [
        { value: '', label: 'No contact' },
        ...this.contacts().map((contact) => ({
            value: contact.id,
            label: `${contact.fullName} · ${contact.company || 'No company'}`,
        })),
    ]);

    form = this.fb.group({
        title: ['', Validators.required],
        value: [0, Validators.required],
        currency: ['USD'],
        stage: ['LEAD' as DealStage],
        contactId: [''],
        expectedCloseDate: [''],
        tags: [''],
        description: [''],
    });

    fieldErrors = signal<Record<string, string[]>>({});
    isSubmitting = signal(false);

    ngOnInit(): void {
        void this.loadContacts();
    }

    close(): void {
        this.dialogRef.close();
    }

    fieldError(field: string): string | null {
        return this.fieldErrors()[field]?.[0] ?? null;
    }

    async loadContacts(): Promise<void> {
        const result = await this.contactService.listContacts({ page: 1, pageSize: 100 });
        this.contacts.set(result.data);
    }

    async onSubmit(): Promise<void> {
        const raw = this.form.getRawValue();
        const payload = {
            title: raw.title.trim(),
            value: raw.value,
            currency: raw.currency.trim() || 'USD',
            stage: raw.stage,
            contactId: raw.contactId || undefined,
            expectedCloseDate: raw.expectedCloseDate || undefined,
            description: raw.description.trim() || undefined,
            tagNames: raw.tags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
        };

        const { tagNames, ...dealPayload } = payload;
        const validation = safeValidate(createDealSchema, dealPayload);
        if (!validation.success) {
            this.fieldErrors.set(validation.errors ?? {});
            return;
        }

        this.fieldErrors.set({});
        this.isSubmitting.set(true);

        try {
            const deal = await this.dealService.createDeal({
                ...validation.data!,
                ...(tagNames.length ? { tagNames } : {}),
            });
            if (deal) {
                this.toastService.show({
                    title: 'Deal created',
                    description: `${deal.title} added to pipeline.`,
                });
                this.dialogRef.close('created');
            }
        } catch {
            this.toastService.show({
                title: 'Failed to create deal',
                variant: 'destructive',
            });
        } finally {
            this.isSubmitting.set(false);
        }
    }
}

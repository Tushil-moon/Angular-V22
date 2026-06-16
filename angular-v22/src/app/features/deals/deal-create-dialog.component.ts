/**
 * Deal Create Dialog
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContactService, DealService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
  DialogComponent,
  ButtonComponent,
  InputComponent,
  LoaderComponent,
} from '@shared/components';
import { DialogRef } from '@shared/dialog';
import { Contact, DEAL_STAGE_LABELS, DealStage } from '@models/index';
import { createDealSchema, safeValidate } from '@utils/validators';

export type DealCreateDialogResult = 'created';

const STAGE_OPTIONS = Object.entries(DEAL_STAGE_LABELS) as [DealStage, string][];

@Component({
  selector: 'app-deal-create-dialog',
  host: { class: 'contents' },
  imports: [ReactiveFormsModule, DialogComponent, ButtonComponent, InputComponent, LoaderComponent],
  template: `
    <app-dialog title="Create deal" description="Add a new opportunity to your pipeline.">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
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
        <div class="form-group">
          <label for="deal-stage" class="form-label">Stage</label>
          <select id="deal-stage" class="input" formControlName="stage">
            @for (option of stageOptions; track option[0]) {
              <option [value]="option[0]">{{ option[1] }}</option>
            }
          </select>
        </div>
        <div class="form-group">
          <label for="deal-contact" class="form-label">Contact</label>
          <select id="deal-contact" class="input" formControlName="contactId">
            <option value="">No contact</option>
            @for (contact of contacts(); track contact.id) {
              <option [value]="contact.id">{{ contact.fullName }} · {{ contact.company || 'No company' }}</option>
            }
          </select>
        </div>
        <app-input
          id="deal-close-date"
          type="date"
          label="Expected close date"
          formControlName="expectedCloseDate"
        />
        <div class="form-group">
          <label for="deal-description" class="form-label">Description</label>
          <textarea id="deal-description" class="input min-h-24 resize-y" formControlName="description"></textarea>
        </div>
      </form>

      <div dialogFooter class="flex justify-end gap-2">
        <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
        <app-button type="button" [disabled]="isSubmitting()" (clicked)="onSubmit()">
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
  private readonly dialogRef = inject(DialogRef<DealCreateDialogComponent, DealCreateDialogResult>);

  readonly stageOptions = STAGE_OPTIONS;
  contacts = signal<Contact[]>([]);

  form = this.fb.group({
    title: ['', Validators.required],
    value: [0, Validators.required],
    currency: ['USD'],
    stage: ['LEAD' as DealStage],
    contactId: [''],
    expectedCloseDate: [''],
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
    };

    const validation = safeValidate(createDealSchema, payload);
    if (!validation.success) {
      this.fieldErrors.set(validation.errors ?? {});
      return;
    }

    this.fieldErrors.set({});
    this.isSubmitting.set(true);

    try {
      const deal = await this.dealService.createDeal(validation.data!);
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

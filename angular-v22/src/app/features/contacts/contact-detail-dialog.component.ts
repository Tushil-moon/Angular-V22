/**
 * Contact Detail Dialog — view, edit, activities, delete
 */

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivityService, ContactService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
  DialogComponent,
  ButtonComponent,
  LoaderComponent,
  IconComponent,
  InputComponent,
} from '@shared/components';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';
import {
  contactStatusBadgeClass,
  formatContactDate,
  formatContactStatus,
} from '@shared/config/contacts-table.config';
import {
  Activity,
  CONTACT_STATUS_LABELS,
  Contact,
  ContactStatus,
  ACTIVITY_TYPE_LABELS,
  ActivityType,
} from '@models/index';
import { createActivitySchema, updateContactSchema, safeValidate } from '@utils/validators';

export interface ContactDetailDialogData {
  contactId: string;
}

export type ContactDetailDialogResult = 'deleted' | 'updated';

type DialogMode = 'view' | 'edit' | 'delete' | 'activity';

const STATUS_OPTIONS = Object.entries(CONTACT_STATUS_LABELS) as [ContactStatus, string][];
const ACTIVITY_OPTIONS = Object.entries(ACTIVITY_TYPE_LABELS) as [ActivityType, string][];

@Component({
  selector: 'app-contact-detail-dialog',
  host: { class: 'contents' },
  imports: [
    ReactiveFormsModule,
    DialogComponent,
    ButtonComponent,
    LoaderComponent,
    InputComponent,
  ],
  template: `
    <app-dialog [title]="dialogTitle()" [description]="dialogDescription()">
      @if (mode() === 'delete') {
        <p class="text-sm text-muted-foreground">
          Delete
          <span class="font-medium text-foreground">{{ contact()?.fullName }}</span>?
          Associated deals will remain but lose this contact link.
        </p>
      } @else if (isLoading()) {
        <div class="flex justify-center py-8">
          <app-loader />
        </div>
      } @else if (contact(); as item) {
        @if (mode() === 'edit') {
          <form [formGroup]="editForm" class="space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <app-input
                id="edit-first-name"
                label="First name"
                formControlName="firstName"
                [error]="fieldError('firstName')"
              />
              <app-input
                id="edit-last-name"
                label="Last name"
                formControlName="lastName"
                [error]="fieldError('lastName')"
              />
            </div>
            <app-input id="edit-email" type="email" label="Email" formControlName="email" />
            <app-input id="edit-phone" label="Phone" formControlName="phone" />
            <app-input id="edit-company" label="Company" formControlName="company" />
            <app-input id="edit-job-title" label="Job title" formControlName="jobTitle" />
            <div class="form-group">
              <label for="edit-status" class="form-label">Status</label>
              <select id="edit-status" class="input" formControlName="status">
                @for (option of statusOptions; track option[0]) {
                  <option [value]="option[0]">{{ option[1] }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label for="edit-notes" class="form-label">Notes</label>
              <textarea id="edit-notes" class="input min-h-24 resize-y" formControlName="notes"></textarea>
            </div>
          </form>
        } @else if (mode() === 'activity') {
          <form [formGroup]="activityForm" class="space-y-4">
            <div class="form-group">
              <label for="activity-type" class="form-label">Type</label>
              <select id="activity-type" class="input" formControlName="type">
                @for (option of activityOptions; track option[0]) {
                  <option [value]="option[0]">{{ option[1] }}</option>
                }
              </select>
            </div>
            <app-input
              id="activity-subject"
              label="Subject"
              formControlName="subject"
              [error]="activityFieldError('subject')"
            />
            <div class="form-group">
              <label for="activity-body" class="form-label">Details</label>
              <textarea id="activity-body" class="input min-h-24 resize-y" formControlName="body"></textarea>
            </div>
          </form>
        } @else {
          <div class="space-y-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-lg font-semibold text-foreground">{{ item.fullName }}</p>
                <p class="text-sm text-muted-foreground">
                  {{ item.jobTitle || '—' }} · {{ item.company || 'No company' }}
                </p>
              </div>
              <span [class]="statusBadgeClass(item.status)">{{ formatStatus(item.status) }}</span>
            </div>

            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="space-y-1">
                <dt class="text-xs font-medium text-muted-foreground">Email</dt>
                <dd class="text-sm text-foreground">{{ item.email || '—' }}</dd>
              </div>
              <div class="space-y-1">
                <dt class="text-xs font-medium text-muted-foreground">Phone</dt>
                <dd class="text-sm text-foreground">{{ item.phone || '—' }}</dd>
              </div>
              <div class="space-y-1">
                <dt class="text-xs font-medium text-muted-foreground">Owner</dt>
                <dd class="text-sm text-foreground">{{ item.owner?.email || '—' }}</dd>
              </div>
              <div class="space-y-1">
                <dt class="text-xs font-medium text-muted-foreground">Created</dt>
                <dd class="text-sm text-foreground">{{ formatDate(item.createdAt) }}</dd>
              </div>
            </dl>

            @if (item.notes) {
              <div class="space-y-1">
                <p class="text-xs font-medium text-muted-foreground">Notes</p>
                <p class="text-sm text-foreground whitespace-pre-wrap">{{ item.notes }}</p>
              </div>
            }

            <div class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-medium text-foreground">Recent activity</p>
                <app-button variant="outline" size="sm" type="button" (clicked)="mode.set('activity')">
                  Log activity
                </app-button>
              </div>
              @if (activitiesLoading()) {
                <div class="flex justify-center py-4">
                  <app-loader size="sm" />
                </div>
              } @else if (activities().length === 0) {
                <p class="text-sm text-muted-foreground">No activity logged yet.</p>
              } @else {
                <div class="divide-y divide-border rounded-md border border-border">
                  @for (activity of activities(); track activity.id) {
                    <div class="space-y-1 px-3 py-3">
                      <div class="flex items-center justify-between gap-2">
                        <p class="text-sm font-medium text-foreground">{{ activity.subject }}</p>
                        <span class="text-xs text-muted-foreground">{{ formatActivityType(activity.type) }}</span>
                      </div>
                      @if (activity.body) {
                        <p class="text-sm text-muted-foreground">{{ activity.body }}</p>
                      }
                      <p class="text-xs text-muted-foreground">{{ formatDate(activity.createdAt) }}</p>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      }

      <div dialogFooter class="flex flex-wrap justify-end gap-2">
        @if (mode() === 'view' && contact()) {
          <app-button variant="outline" type="button" (clicked)="mode.set('delete')">Delete</app-button>
          <app-button variant="outline" type="button" (clicked)="enterEditMode()">Edit</app-button>
          <app-button type="button" (clicked)="close()">Close</app-button>
        } @else if (mode() === 'edit') {
          <app-button variant="outline" type="button" (clicked)="cancelEdit()">Cancel</app-button>
          <app-button type="button" [disabled]="isSubmitting()" (clicked)="saveEdit()">
            @if (isSubmitting()) {
              <app-loader size="sm" [inline]="true" />
            } @else {
              Save changes
            }
          </app-button>
        } @else if (mode() === 'activity') {
          <app-button variant="outline" type="button" (clicked)="mode.set('view')">Cancel</app-button>
          <app-button type="button" [disabled]="isSubmitting()" (clicked)="saveActivity()">
            @if (isSubmitting()) {
              <app-loader size="sm" [inline]="true" />
            } @else {
              Log activity
            }
          </app-button>
        } @else if (mode() === 'delete') {
          <app-button variant="outline" type="button" (clicked)="mode.set('view')">Cancel</app-button>
          <app-button variant="destructive" type="button" [disabled]="isSubmitting()" (clicked)="confirmDelete()">
            @if (isSubmitting()) {
              <app-loader size="sm" [inline]="true" />
            } @else {
              Delete contact
            }
          </app-button>
        }
      </div>
    </app-dialog>
  `,
})
export class ContactDetailDialogComponent implements OnInit {
  private readonly contactService = inject(ContactService);
  private readonly activityService = inject(ActivityService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = inject(DialogRef<ContactDetailDialogComponent, ContactDetailDialogResult>);
  private readonly data = inject<ContactDetailDialogData>(DIALOG_DATA);

  readonly statusOptions = STATUS_OPTIONS;
  readonly activityOptions = ACTIVITY_OPTIONS;
  readonly statusBadgeClass = contactStatusBadgeClass;
  readonly formatStatus = formatContactStatus;
  readonly formatDate = formatContactDate;
  readonly formatActivityType = (type: ActivityType) => ACTIVITY_TYPE_LABELS[type];

  mode = signal<DialogMode>('view');
  contact = signal<Contact | null>(null);
  activities = signal<Activity[]>([]);
  isLoading = signal(true);
  activitiesLoading = signal(true);
  isSubmitting = signal(false);
  fieldErrors = signal<Record<string, string[]>>({});
  activityFieldErrors = signal<Record<string, string[]>>({});

  editForm = this.fb.group({
    firstName: [''],
    lastName: [''],
    email: [''],
    phone: [''],
    company: [''],
    jobTitle: [''],
    status: ['LEAD' as ContactStatus],
    notes: [''],
  });

  activityForm = this.fb.group({
    type: ['NOTE' as ActivityType],
    subject: [''],
    body: [''],
  });

  dialogTitle = computed(() => {
    switch (this.mode()) {
      case 'edit':
        return 'Edit contact';
      case 'delete':
        return 'Delete contact';
      case 'activity':
        return 'Log activity';
      default:
        return this.contact()?.fullName ?? 'Contact details';
    }
  });

  dialogDescription = computed(() => {
    switch (this.mode()) {
      case 'edit':
        return 'Update contact information.';
      case 'delete':
        return 'This action cannot be undone.';
      case 'activity':
        return 'Record a call, email, meeting, or note.';
      default:
        return 'Contact profile and activity timeline.';
    }
  });

  ngOnInit(): void {
    void this.loadContact();
  }

  close(): void {
    this.dialogRef.close();
  }

  fieldError(field: string): string | null {
    return this.fieldErrors()[field]?.[0] ?? null;
  }

  activityFieldError(field: string): string | null {
    return this.activityFieldErrors()[field]?.[0] ?? null;
  }

  enterEditMode(): void {
    const item = this.contact();
    if (!item) return;
    this.editForm.patchValue({
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email ?? '',
      phone: item.phone ?? '',
      company: item.company ?? '',
      jobTitle: item.jobTitle ?? '',
      status: item.status,
      notes: item.notes ?? '',
    });
    this.mode.set('edit');
  }

  cancelEdit(): void {
    this.fieldErrors.set({});
    this.mode.set('view');
  }

  async loadContact(): Promise<void> {
    this.isLoading.set(true);
    try {
      const contact = await this.contactService.getContactById(this.data.contactId);
      this.contact.set(contact);
      if (contact) void this.loadActivities(contact.id);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadActivities(contactId: string): Promise<void> {
    this.activitiesLoading.set(true);
    try {
      const result = await this.activityService.listActivities({ contactId, pageSize: 5 });
      this.activities.set(result.data);
    } finally {
      this.activitiesLoading.set(false);
    }
  }

  async saveEdit(): Promise<void> {
    const item = this.contact();
    if (!item) return;

    const raw = this.editForm.getRawValue();
    const payload = {
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      email: raw.email.trim() || undefined,
      phone: raw.phone.trim() || undefined,
      company: raw.company.trim() || undefined,
      jobTitle: raw.jobTitle.trim() || undefined,
      status: raw.status,
      notes: raw.notes.trim() || undefined,
    };

    const validation = safeValidate(updateContactSchema, payload);
    if (!validation.success) {
      this.fieldErrors.set(validation.errors ?? {});
      return;
    }

    this.fieldErrors.set({});
    this.isSubmitting.set(true);

    try {
      const updated = await this.contactService.updateContact(item.id, validation.data!);
      if (updated) {
        this.contact.set(updated);
        this.toastService.show({ title: 'Contact updated', description: updated.fullName });
        this.mode.set('view');
        this.dialogRef.close('updated');
      }
    } catch {
      this.toastService.show({
        title: 'Update failed',
        description: 'Could not save contact changes.',
        variant: 'destructive',
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async saveActivity(): Promise<void> {
    const item = this.contact();
    if (!item) return;

    const raw = this.activityForm.getRawValue();
    const payload = {
      type: raw.type,
      subject: raw.subject.trim(),
      body: raw.body.trim() || undefined,
      contactId: item.id,
    };

    const validation = safeValidate(createActivitySchema, payload);
    if (!validation.success) {
      this.activityFieldErrors.set(validation.errors ?? {});
      return;
    }

    this.activityFieldErrors.set({});
    this.isSubmitting.set(true);

    try {
      const activity = await this.activityService.createActivity({
        ...validation.data!,
        contactId: item.id,
      });
      if (activity) {
        this.activities.update((items) => [activity, ...items].slice(0, 5));
        this.activityForm.reset({ type: 'NOTE', subject: '', body: '' });
        this.toastService.show({ title: 'Activity logged', description: activity.subject });
        this.mode.set('view');
      }
    } catch {
      this.toastService.show({
        title: 'Failed to log activity',
        variant: 'destructive',
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async confirmDelete(): Promise<void> {
    const item = this.contact();
    if (!item) return;

    this.isSubmitting.set(true);
    try {
      await this.contactService.deleteContact(item.id);
      this.toastService.show({
        title: 'Contact deleted',
        description: `${item.fullName} was removed.`,
      });
      this.dialogRef.close('deleted');
    } catch {
      this.toastService.show({
        title: 'Delete failed',
        variant: 'destructive',
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

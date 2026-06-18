/**
 * Contact Detail Dialog — view, edit, activities, delete
 */

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivityService, ContactService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
  DialogComponent,
  ButtonComponent,
  LoaderComponent,
  InputComponent,
  SelectComponent,
  SelectOption,
  TextareaComponent,
  CheckboxComponent,
  BadgeComponent,
} from '@shared/components';
import { TagBadgesComponent } from '@shared/components/tag-badges.component';
import { Permissions } from '@shared/constants/permissions';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';
import {
  contactStatusBadgeVariant,
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

type DialogMode = 'view' | 'edit' | 'delete' | 'activity' | 'convert';

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
    TagBadgesComponent,
    SelectComponent,
    TextareaComponent,
    CheckboxComponent,
    BadgeComponent,
  ],
  template: `
    <app-dialog
      [title]="dialogTitle()"
      [description]="dialogDescription()"
      size="lg"
      [showFooter]="footerVisible()"
    >
      @if (mode() === 'delete') {
        <p class="text-sm text-muted-foreground">
          Delete
          <span class="font-medium text-foreground">{{ contact()?.fullName }}</span>?
          Associated deals will remain but lose this contact link.
        </p>
      } @else if (isLoading()) {
        <div class="dialog-loading">
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
            <div class="grid gap-4 sm:grid-cols-2">
              <app-input id="edit-phone" label="Phone" formControlName="phone" />
              <app-input id="edit-company" label="Company" formControlName="company" />
            </div>
            <app-input id="edit-job-title" label="Job title" formControlName="jobTitle" />
            <app-select
              id="edit-status"
              label="Status"
              formControlName="status"
              [options]="statusSelectOptions"
            />
            <app-textarea id="edit-notes" label="Notes" formControlName="notes" />
          </form>
        } @else if (mode() === 'activity') {
          <form [formGroup]="activityForm" class="space-y-4">
            <app-select
              id="activity-type"
              label="Type"
              formControlName="type"
              [options]="activitySelectOptions"
            />
            <app-input
              id="activity-subject"
              label="Subject"
              formControlName="subject"
              [error]="activityFieldError('subject')"
            />
            <app-textarea id="activity-body" label="Details" formControlName="body" />
          </form>
        } @else if (mode() === 'convert') {
          <form [formGroup]="convertForm" class="space-y-4">
            <app-select
              id="convert-status"
              label="New status"
              formControlName="status"
              [options]="convertStatusOptions"
            />
            <div class="dialog-convert-panel">
              <app-checkbox
                id="convert-create-deal"
                label="Create deal from this lead"
                formControlName="createDeal"
              />
              @if (convertForm.controls.createDeal.value) {
                <app-input id="convert-deal-title" label="Deal title" formControlName="dealTitle" />
                <app-input
                  id="convert-deal-value"
                  type="number"
                  label="Deal value"
                  formControlName="dealValue"
                />
              }
            </div>
          </form>
        } @else {
          <div class="space-y-6">
            <div class="dialog-detail-header">
              <div>
                <p class="text-lg font-semibold text-foreground">{{ item.fullName }}</p>
                <p class="text-sm text-muted-foreground">
                  {{ item.jobTitle || '—' }} · {{ item.companyRef?.name || item.company || 'No company' }}
                </p>
              </div>
              <app-badge [variant]="statusBadgeVariant(item.status)">{{ formatStatus(item.status) }}</app-badge>
            </div>

            @if (item.tags?.length) {
              <app-tag-badges [tags]="item.tags" />
            }

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
            <div class="dialog-section-toolbar">
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
                <div class="dialog-activity-list">
                  @for (activity of activities(); track activity.id) {
                    <div class="dialog-activity-item">
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
      } @else {
        <p class="text-sm text-muted-foreground">Contact not found or you do not have access.</p>
      }

      <div dialogFooter>
        @if (mode() === 'view' && contact()) {
          @if (canManage() && contact()?.status === 'LEAD') {
            <app-button variant="outline" type="button" (clicked)="mode.set('convert')">Convert lead</app-button>
          }
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
        } @else if (mode() === 'convert') {
          <app-button variant="outline" type="button" (clicked)="mode.set('view')">Cancel</app-button>
          <app-button type="button" [disabled]="isSubmitting()" (clicked)="confirmConvert()">
            @if (isSubmitting()) {
              <app-loader size="sm" [inline]="true" />
            } @else {
              Convert lead
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
  private readonly permissionService = inject(PermissionService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = inject(DialogRef<ContactDetailDialogComponent, ContactDetailDialogResult>);
  private readonly data = inject<ContactDetailDialogData>(DIALOG_DATA);

  readonly statusOptions = STATUS_OPTIONS;
  readonly activityOptions = ACTIVITY_OPTIONS;
  readonly statusSelectOptions: SelectOption[] = STATUS_OPTIONS.map(([value, label]) => ({
    value,
    label,
  }));
  readonly activitySelectOptions: SelectOption[] = ACTIVITY_OPTIONS.map(([value, label]) => ({
    value,
    label,
  }));
  readonly convertStatusOptions: SelectOption[] = [
    { value: 'PROSPECT', label: 'Prospect' },
    { value: 'CUSTOMER', label: 'Customer' },
  ];
  readonly statusBadgeVariant = contactStatusBadgeVariant;
  readonly formatStatus = formatContactStatus;
  readonly formatDate = formatContactDate;
  readonly formatActivityType = (type: ActivityType) => ACTIVITY_TYPE_LABELS[type];

  readonly canManage = computed(() =>
    this.permissionService.hasPermission(Permissions.ManageContacts),
  );

  mode = signal<DialogMode>('view');
  contact = signal<Contact | null>(null);
  activities = signal<Activity[]>([]);
  isLoading = signal(true);
  activitiesLoading = signal(true);
  isSubmitting = signal(false);
  wasUpdated = signal(false);
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

  convertForm = this.fb.group({
    status: ['PROSPECT' as 'PROSPECT' | 'CUSTOMER'],
    createDeal: [true],
    dealTitle: [''],
    dealValue: [0],
  });

  dialogTitle = computed(() => {
    switch (this.mode()) {
      case 'edit':
        return 'Edit contact';
      case 'delete':
        return 'Delete contact';
      case 'activity':
        return 'Log activity';
      case 'convert':
        return 'Convert lead';
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
      case 'convert':
        return 'Promote this lead to prospect or customer and optionally create a deal.';
      default:
        return 'Contact profile and activity timeline.';
    }
  });

  footerVisible = computed(() => {
    if (this.isLoading()) return false;
    if (this.mode() === 'view' && !this.contact()) return false;
    return true;
  });

  ngOnInit(): void {
    void this.loadContact();
  }

  close(): void {
    this.dialogRef.close(this.wasUpdated() ? 'updated' : undefined);
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
        this.wasUpdated.set(true);
        this.toastService.show({ title: 'Contact updated', description: updated.fullName });
        this.mode.set('view');
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
        this.wasUpdated.set(true);
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

  async confirmConvert(): Promise<void> {
    const item = this.contact();
    if (!item) return;

    const raw = this.convertForm.getRawValue();
    const payload: {
      status: 'PROSPECT' | 'CUSTOMER';
      deal?: { title: string; value: number };
    } = { status: raw.status };

    if (raw.createDeal) {
      const title = raw.dealTitle.trim() || `${item.fullName} opportunity`;
      payload.deal = { title, value: Number(raw.dealValue) || 0 };
    }

    this.isSubmitting.set(true);
    try {
      const result = await this.contactService.convertLead(item.id, payload);
      if (result) {
        this.contact.set(result.contact);
        this.wasUpdated.set(true);
        this.toastService.show({
          title: 'Lead converted',
          description: result.deal
            ? `${result.contact.fullName} is now a ${result.contact.status.toLowerCase()} with a new deal.`
            : `${result.contact.fullName} is now a ${result.contact.status.toLowerCase()}.`,
        });
        this.mode.set('view');
      }
    } catch {
      this.toastService.show({
        title: 'Conversion failed',
        description: 'Could not convert this lead.',
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

/**
 * Deal Detail Dialog
 */

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivityService, DealService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
  DialogComponent,
  ButtonComponent,
  LoaderComponent,
  InputComponent,
} from '@shared/components';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';
import {
  dealStageBadgeClass,
  formatDealDate,
  formatDealStage,
  formatDealValue,
} from '@shared/config/deals-table.config';
import {
  ACTIVITY_TYPE_LABELS,
  Activity,
  ActivityType,
  DEAL_STAGE_LABELS,
  Deal,
  DealStage,
} from '@models/index';
import { createActivitySchema, updateDealSchema, safeValidate } from '@utils/validators';

export interface DealDetailDialogData {
  dealId: string;
}

export type DealDetailDialogResult = 'deleted' | 'updated';

type DialogMode = 'view' | 'edit' | 'delete' | 'activity';

const STAGE_OPTIONS = Object.entries(DEAL_STAGE_LABELS) as [DealStage, string][];
const ACTIVITY_OPTIONS = Object.entries(ACTIVITY_TYPE_LABELS) as [ActivityType, string][];

@Component({
  selector: 'app-deal-detail-dialog',
  host: { class: 'contents' },
  imports: [ReactiveFormsModule, DialogComponent, ButtonComponent, LoaderComponent, InputComponent],
  template: `
    <app-dialog [title]="dialogTitle()" [description]="dialogDescription()">
      @if (mode() === 'delete') {
        <p class="text-sm text-muted-foreground">
          Delete deal
          <span class="font-medium text-foreground">{{ deal()?.title }}</span>?
        </p>
      } @else if (isLoading()) {
        <div class="flex justify-center py-8"><app-loader /></div>
      } @else if (deal(); as item) {
        @if (mode() === 'edit') {
          <form [formGroup]="editForm" class="space-y-4">
            <app-input id="edit-title" label="Title" formControlName="title" />
            <div class="grid gap-4 sm:grid-cols-2">
              <app-input id="edit-value" type="number" label="Value" formControlName="value" />
              <app-input id="edit-currency" label="Currency" formControlName="currency" />
            </div>
            <div class="form-group">
              <label for="edit-stage" class="form-label">Stage</label>
              <select id="edit-stage" class="input" formControlName="stage">
                @for (option of stageOptions; track option[0]) {
                  <option [value]="option[0]">{{ option[1] }}</option>
                }
              </select>
            </div>
            <app-input id="edit-close-date" type="date" label="Expected close" formControlName="expectedCloseDate" />
            <div class="form-group">
              <label for="edit-description" class="form-label">Description</label>
              <textarea id="edit-description" class="input min-h-24 resize-y" formControlName="description"></textarea>
            </div>
          </form>
        } @else if (mode() === 'activity') {
          <form [formGroup]="activityForm" class="space-y-4">
            <div class="form-group">
              <label for="deal-activity-type" class="form-label">Type</label>
              <select id="deal-activity-type" class="input" formControlName="type">
                @for (option of activityOptions; track option[0]) {
                  <option [value]="option[0]">{{ option[1] }}</option>
                }
              </select>
            </div>
            <app-input id="deal-activity-subject" label="Subject" formControlName="subject" />
            <div class="form-group">
              <label for="deal-activity-body" class="form-label">Details</label>
              <textarea id="deal-activity-body" class="input min-h-24 resize-y" formControlName="body"></textarea>
            </div>
          </form>
        } @else {
          <div class="space-y-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-lg font-semibold text-foreground">{{ item.title }}</p>
                <p class="text-sm text-muted-foreground">
                  {{ item.contact?.fullName || 'No linked contact' }}
                  @if (item.contact?.company) {
                    · {{ item.contact?.company }}
                  }
                </p>
              </div>
              <span [class]="stageBadgeClass(item.stage)">{{ formatStage(item.stage) }}</span>
            </div>

            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="space-y-1">
                <dt class="text-xs font-medium text-muted-foreground">Value</dt>
                <dd class="text-sm font-medium text-foreground">{{ formatValue(item.value, item.currency) }}</dd>
              </div>
              <div class="space-y-1">
                <dt class="text-xs font-medium text-muted-foreground">Expected close</dt>
                <dd class="text-sm text-foreground">{{ formatDate(item.expectedCloseDate) }}</dd>
              </div>
              <div class="space-y-1">
                <dt class="text-xs font-medium text-muted-foreground">Owner</dt>
                <dd class="text-sm text-foreground">{{ item.owner?.email || '—' }}</dd>
              </div>
              <div class="space-y-1">
                <dt class="text-xs font-medium text-muted-foreground">Updated</dt>
                <dd class="text-sm text-foreground">{{ formatDate(item.updatedAt) }}</dd>
              </div>
            </dl>

            @if (item.description) {
              <div class="space-y-1">
                <p class="text-xs font-medium text-muted-foreground">Description</p>
                <p class="text-sm text-foreground whitespace-pre-wrap">{{ item.description }}</p>
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
                <div class="flex justify-center py-4"><app-loader size="sm" /></div>
              } @else if (activities().length === 0) {
                <p class="text-sm text-muted-foreground">No activity logged yet.</p>
              } @else {
                <div class="divide-y divide-border rounded-md border border-border">
                  @for (activity of activities(); track activity.id) {
                    <div class="space-y-1 px-3 py-3">
                      <p class="text-sm font-medium text-foreground">{{ activity.subject }}</p>
                      @if (activity.body) {
                        <p class="text-sm text-muted-foreground">{{ activity.body }}</p>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      }

      <div dialogFooter class="flex flex-wrap justify-end gap-2">
        @if (mode() === 'view' && deal()) {
          <app-button variant="outline" type="button" (clicked)="mode.set('delete')">Delete</app-button>
          <app-button variant="outline" type="button" (clicked)="enterEditMode()">Edit</app-button>
          <app-button type="button" (clicked)="close()">Close</app-button>
        } @else if (mode() === 'edit') {
          <app-button variant="outline" type="button" (clicked)="mode.set('view')">Cancel</app-button>
          <app-button type="button" [disabled]="isSubmitting()" (clicked)="saveEdit()">Save changes</app-button>
        } @else if (mode() === 'activity') {
          <app-button variant="outline" type="button" (clicked)="mode.set('view')">Cancel</app-button>
          <app-button type="button" [disabled]="isSubmitting()" (clicked)="saveActivity()">Log activity</app-button>
        } @else if (mode() === 'delete') {
          <app-button variant="outline" type="button" (clicked)="mode.set('view')">Cancel</app-button>
          <app-button variant="destructive" type="button" [disabled]="isSubmitting()" (clicked)="confirmDelete()">
            Delete deal
          </app-button>
        }
      </div>
    </app-dialog>
  `,
})
export class DealDetailDialogComponent implements OnInit {
  private readonly dealService = inject(DealService);
  private readonly activityService = inject(ActivityService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = inject(DialogRef<DealDetailDialogComponent, DealDetailDialogResult>);
  private readonly data = inject<DealDetailDialogData>(DIALOG_DATA);

  readonly stageOptions = STAGE_OPTIONS;
  readonly activityOptions = ACTIVITY_OPTIONS;
  readonly stageBadgeClass = dealStageBadgeClass;
  readonly formatStage = formatDealStage;
  readonly formatValue = formatDealValue;
  readonly formatDate = formatDealDate;

  mode = signal<DialogMode>('view');
  deal = signal<Deal | null>(null);
  activities = signal<Activity[]>([]);
  isLoading = signal(true);
  activitiesLoading = signal(true);
  isSubmitting = signal(false);

  editForm = this.fb.group({
    title: [''],
    value: [0],
    currency: ['USD'],
    stage: ['LEAD' as DealStage],
    expectedCloseDate: [''],
    description: [''],
  });

  activityForm = this.fb.group({
    type: ['NOTE' as ActivityType],
    subject: [''],
    body: [''],
  });

  dialogTitle = computed(() => {
    if (this.mode() === 'edit') return 'Edit deal';
    if (this.mode() === 'delete') return 'Delete deal';
    if (this.mode() === 'activity') return 'Log activity';
    return this.deal()?.title ?? 'Deal details';
  });

  dialogDescription = computed(() => {
    if (this.mode() === 'edit') return 'Update deal details and stage.';
    if (this.mode() === 'delete') return 'This action cannot be undone.';
    if (this.mode() === 'activity') return 'Record progress on this deal.';
    return 'Pipeline opportunity overview.';
  });

  ngOnInit(): void {
    void this.loadDeal();
  }

  close(): void {
    this.dialogRef.close();
  }

  enterEditMode(): void {
    const item = this.deal();
    if (!item) return;
    this.editForm.patchValue({
      title: item.title,
      value: item.value,
      currency: item.currency,
      stage: item.stage,
      expectedCloseDate: item.expectedCloseDate
        ? item.expectedCloseDate.toISOString().slice(0, 10)
        : '',
      description: item.description ?? '',
    });
    this.mode.set('edit');
  }

  async loadDeal(): Promise<void> {
    this.isLoading.set(true);
    try {
      const deal = await this.dealService.getDealById(this.data.dealId);
      this.deal.set(deal);
      if (deal) void this.loadActivities(deal.id);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadActivities(dealId: string): Promise<void> {
    this.activitiesLoading.set(true);
    try {
      const result = await this.activityService.listActivities({ dealId, pageSize: 5 });
      this.activities.set(result.data);
    } finally {
      this.activitiesLoading.set(false);
    }
  }

  async saveEdit(): Promise<void> {
    const item = this.deal();
    if (!item) return;

    const raw = this.editForm.getRawValue();
    const payload = {
      title: raw.title.trim(),
      value: raw.value,
      currency: raw.currency.trim(),
      stage: raw.stage,
      expectedCloseDate: raw.expectedCloseDate || undefined,
      description: raw.description.trim() || undefined,
    };

    const validation = safeValidate(updateDealSchema, payload);
    if (!validation.success) return;

    this.isSubmitting.set(true);
    try {
      const updated = await this.dealService.updateDeal(item.id, validation.data!);
      if (updated) {
        this.deal.set(updated);
        this.toastService.show({ title: 'Deal updated', description: updated.title });
        this.mode.set('view');
        this.dialogRef.close('updated');
      }
    } catch {
      this.toastService.show({ title: 'Update failed', variant: 'destructive' });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async saveActivity(): Promise<void> {
    const item = this.deal();
    if (!item) return;

    const raw = this.activityForm.getRawValue();
    const validation = safeValidate(createActivitySchema, {
      type: raw.type,
      subject: raw.subject.trim(),
      body: raw.body.trim() || undefined,
    });
    if (!validation.success) return;

    this.isSubmitting.set(true);
    try {
      const activity = await this.activityService.createActivity({
        ...validation.data!,
        dealId: item.id,
        contactId: item.contactId ?? undefined,
      });
      if (activity) {
        this.activities.update((items) => [activity, ...items].slice(0, 5));
        this.activityForm.reset({ type: 'NOTE', subject: '', body: '' });
        this.mode.set('view');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async confirmDelete(): Promise<void> {
    const item = this.deal();
    if (!item) return;

    this.isSubmitting.set(true);
    try {
      await this.dealService.deleteDeal(item.id);
      this.toastService.show({ title: 'Deal deleted', description: item.title });
      this.dialogRef.close('deleted');
    } catch {
      this.toastService.show({ title: 'Delete failed', variant: 'destructive' });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

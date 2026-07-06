/**
 * Calendar Event Dialog — create and edit scheduled events
 */

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { CalendarEvent } from '@models/enterprise.model';
import { AuthService, CalendarService, ContactService, DealService } from '@services/index';
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
import { DIALOG_DATA, DialogRef } from '@shared/dialog';

export interface CalendarEventDialogData {
    eventId?: string;
    startsAt?: string;
    endsAt?: string;
}

export type CalendarEventDialogResult = 'saved' | 'deleted';

const TYPE_OPTIONS: SelectOption[] = [
    { value: 'MEETING', label: 'Meeting' },
    { value: 'CALL', label: 'Call' },
    { value: 'TASK', label: 'Task' },
    { value: 'REMINDER', label: 'Reminder' },
    { value: 'OUT_OF_OFFICE', label: 'Out of office' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-calendar-event-dialog',
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
        <app-dialog
            [title]="data.eventId ? 'Edit event' : 'Schedule event'"
            description="Plan meetings, calls, and tasks on your calendar."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-4">
                    <app-input id="event-title" label="Title" formControlName="title" [required]="true" />
                    <app-select
                        id="event-type"
                        label="Type"
                        formControlName="type"
                        [options]="typeOptions"
                    />
                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-input
                            id="event-start"
                            type="datetime-local"
                            label="Starts"
                            formControlName="startsAt"
                            [required]="true"
                        />
                        <app-input
                            id="event-end"
                            type="datetime-local"
                            label="Ends"
                            formControlName="endsAt"
                            [required]="true"
                        />
                    </div>
                    <app-input id="event-location" label="Location" formControlName="location" />
                    <app-textarea id="event-description" label="Description" formControlName="description" />
                    <app-select
                        id="event-contact"
                        label="Contact"
                        formControlName="contactId"
                        [options]="contactOptions()"
                        placeholder="Optional"
                    />
                    <app-select
                        id="event-deal"
                        label="Deal"
                        formControlName="dealId"
                        [options]="dealOptions()"
                        placeholder="Optional"
                    />
                </form>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (data.eventId) {
                    <app-button variant="destructive" type="button" [disabled]="submitting()" (clicked)="deleteEvent()">
                        Delete
                    </app-button>
                }
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                <app-button type="button" [disabled]="submitting() || loading()" (clicked)="save()">
                    @if (submitting()) {
                        <app-loader size="sm" [inline]="true" />
                    } @else {
                        Save event
                    }
                </app-button>
            </div>
        </app-dialog>
    `,
})
export class CalendarEventDialogComponent implements OnInit {
    private readonly calendarService = inject(CalendarService);
    private readonly contactService = inject(ContactService);
    private readonly dealService = inject(DealService);
    private readonly authService = inject(AuthService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly dialogRef = inject(
        DialogRef<CalendarEventDialogComponent, CalendarEventDialogResult>,
    );
    readonly data = inject<CalendarEventDialogData>(DIALOG_DATA);

    readonly typeOptions = TYPE_OPTIONS;
    contactOptions = signal<SelectOption[]>([{ value: '', label: 'None' }]);
    dealOptions = signal<SelectOption[]>([{ value: '', label: 'None' }]);
    loading = signal(!!this.data.eventId);
    submitting = signal(false);

    form = this.fb.group({
        title: ['', Validators.required],
        type: ['MEETING'],
        startsAt: ['', Validators.required],
        endsAt: ['', Validators.required],
        location: [''],
        description: [''],
        contactId: [''],
        dealId: [''],
    });

    ngOnInit(): void {
        void this.loadOptions();
        if (this.data.eventId) {
            void this.loadEvent();
        } else if (this.data.startsAt && this.data.endsAt) {
            this.form.patchValue({
                startsAt: this.data.startsAt.slice(0, 16),
                endsAt: this.data.endsAt.slice(0, 16),
            });
        }
    }

    async loadOptions(): Promise<void> {
        const [contacts, deals] = await Promise.all([
            this.contactService.listContacts({ pageSize: 50 }),
            this.dealService.listDeals({ pageSize: 50 }),
        ]);
        this.contactOptions.set([
            { value: '', label: 'None' },
            ...contacts.data.map((c) => ({ value: c.id, label: c.fullName })),
        ]);
        this.dealOptions.set([
            { value: '', label: 'None' },
            ...deals.data.map((d) => ({ value: d.id, label: d.title })),
        ]);
    }

    async loadEvent(): Promise<void> {
        if (!this.data.eventId) return;
        this.loading.set(true);
        try {
            const event = await this.calendarService.getById(this.data.eventId);
            if (event) this.patchForm(event);
        } finally {
            this.loading.set(false);
        }
    }

    close(): void {
        this.dialogRef.close();
    }

    async save(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        const userId = this.authService.currentUser()?.id;
        const payload = {
            ...(userId ? { userId } : {}),
            title: raw.title.trim(),
            type: raw.type,
            startsAt: new Date(raw.startsAt).toISOString(),
            endsAt: new Date(raw.endsAt).toISOString(),
            location: raw.location.trim() || undefined,
            description: raw.description.trim() || undefined,
            contactId: raw.contactId || undefined,
            dealId: raw.dealId || undefined,
        };

        this.submitting.set(true);
        try {
            const saved = this.data.eventId
                ? await this.calendarService.update(this.data.eventId, payload)
                : await this.calendarService.create(payload);

            if (saved) {
                this.toastService.success('Event saved', saved.title);
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.error('Save failed', 'Could not save calendar event.');
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteEvent(): Promise<void> {
        if (!this.data.eventId) return;
        this.submitting.set(true);
        try {
            await this.calendarService.delete(this.data.eventId);
            this.toastService.success('Event deleted', 'Removed from calendar.');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.error('Delete failed', 'Could not delete event.');
        } finally {
            this.submitting.set(false);
        }
    }

    private patchForm(event: CalendarEvent): void {
        this.form.patchValue({
            title: event.title,
            type: event.type,
            startsAt: event.startsAt.slice(0, 16),
            endsAt: event.endsAt.slice(0, 16),
            location: event.location ?? '',
            description: event.description ?? '',
            contactId: event.contactId ?? '',
            dealId: event.dealId ?? '',
        });
    }
}

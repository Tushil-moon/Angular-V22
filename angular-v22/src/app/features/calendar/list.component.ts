/**
 * Calendar — month grid with agenda sidebar (SaaS scheduling view)
 */

import { Component, computed, inject, resource, signal, ViewEncapsulation } from '@angular/core';
import type { CalendarEvent } from '@models/enterprise.model';
import { AuthService, CalendarService } from '@services/index';
import { ToastService } from '@services/toast.service';
import { BadgeComponent } from '@shared/components/badge.component';
import { ButtonComponent } from '@shared/components/button.component';
import {
    CardBodyComponent,
    CardComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
} from '@shared/components/card.component';
import { IconComponent } from '@shared/components/icon.component';
import {
    ModuleWorkspaceShellComponent,
    type WorkspaceNavItem,
} from '@shared/components/module-workspace-shell.component';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    isToday,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns';

import { formatEnterpriseDate } from '../enterprise/enterprise-list.util';
import {
    enterpriseStatusBadge,
    formatEnterpriseStatus,
} from '../enterprise/enterprise-ui.util';

const CALENDAR_NAV: WorkspaceNavItem[] = [
    { label: 'Sales', route: '/dashboard/sales', icon: 'briefcase' },
    { label: 'Calendar', route: '/dashboard/calendar', icon: 'calendar' },
];

interface CalendarDayCell {
    date: Date;
    inMonth: boolean;
    isToday: boolean;
    events: CalendarEvent[];
}

@Component({
    selector: 'app-calendar-list',
    imports: [
        ModuleWorkspaceShellComponent,
        CardComponent,
        CardHeaderComponent,
        CardTitleComponent,
        CardDescriptionComponent,
        CardBodyComponent,
        ButtonComponent,
        IconComponent,
        BadgeComponent,
    ],
    template: `
        <app-module-workspace-shell
            eyebrow="Sales Cloud"
            title="Calendar"
            description="Meetings, calls, and tasks across your team"
            [navItems]="navItems"
        >
            <div workspaceActions>
                <app-button size="sm" [disabled]="creating()" (clicked)="createEvent()">
                    <app-icon name="plus" [size]="14" />
                    Schedule
                </app-button>
            </div>

            <div class="calendar-workspace">
                <app-card class="calendar-grid-card">
                    <app-card-header [row]="true">
                        <div>
                            <app-card-title>{{ monthLabel() }}</app-card-title>
                            <app-card-description>{{ events().length }} events this month</app-card-description>
                        </div>
                        <div class="flex gap-1">
                            <app-button variant="outline" size="icon" type="button" (clicked)="previousMonth()">
                                <app-icon name="chevron-left" [size]="16" />
                            </app-button>
                            <app-button variant="outline" size="sm" type="button" (clicked)="goToday()">
                                Today
                            </app-button>
                            <app-button variant="outline" size="icon" type="button" (clicked)="nextMonth()">
                                <app-icon name="chevron-right" [size]="16" />
                            </app-button>
                        </div>
                    </app-card-header>
                    <app-card-body>
                        <div class="calendar-weekdays">
                            @for (day of weekdays; track day) {
                                <span>{{ day }}</span>
                            }
                        </div>
                        <div class="calendar-month-grid">
                            @for (cell of monthCells(); track cell.date.toISOString()) {
                                <button
                                    type="button"
                                    class="calendar-day-cell"
                                    [class.calendar-day-outside]="!cell.inMonth"
                                    [class.calendar-day-today]="cell.isToday"
                                    [class.calendar-day-selected]="isSelectedDay(cell.date)"
                                    (click)="selectedDate.set(cell.date)"
                                >
                                    <span class="calendar-day-number">{{ cell.date.getDate() }}</span>
                                    @if (cell.events.length > 0) {
                                        <span class="calendar-day-dots">
                                            @for (ev of cell.events.slice(0, 3); track ev.id) {
                                                <span class="calendar-event-dot"></span>
                                            }
                                        </span>
                                    }
                                </button>
                            }
                        </div>
                    </app-card-body>
                </app-card>

                <app-card class="calendar-agenda-card">
                    <app-card-header>
                        <app-card-title>{{ selectedLabel() }}</app-card-title>
                        <app-card-description>Agenda</app-card-description>
                    </app-card-header>
                    <app-card-body>
                        @if (agendaEvents().length === 0) {
                            <p class="text-sm text-muted-foreground">No events scheduled.</p>
                        } @else {
                            <div class="calendar-agenda-list">
                                @for (event of agendaEvents(); track event.id) {
                                    <div class="calendar-agenda-item">
                                        <div class="calendar-agenda-time">
                                            {{ formatTime(event.startsAt) }}
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <p class="font-medium">{{ event.title }}</p>
                                            <app-badge [variant]="enterpriseStatusBadge(event.type)">
                                                {{ formatEnterpriseStatus(event.type) }}
                                            </app-badge>
                                        </div>
                                    </div>
                                }
                            </div>
                        }
                    </app-card-body>
                </app-card>
            </div>
        </app-module-workspace-shell>
    `,
    styleUrl: './calendar-workspace.component.scss',
    encapsulation: ViewEncapsulation.None,
})
export class CalendarListComponent {
    private readonly calendarService = inject(CalendarService);
    private readonly authService = inject(AuthService);
    private readonly toastService = inject(ToastService);

    readonly navItems = CALENDAR_NAV;
    readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    readonly enterpriseStatusBadge = enterpriseStatusBadge;
    readonly formatEnterpriseStatus = formatEnterpriseStatus;

    readonly visibleMonth = signal(startOfMonth(new Date()));
    readonly selectedDate = signal(new Date());
    readonly creating = signal(false);

    readonly eventsResource = resource({
        params: () => (this.authService.isAuthenticated() ? this.visibleMonth().toISOString() : undefined),
        loader: async ({ abortSignal }) =>
            runResourceLoader(
                async () => {
                    throwIfAborted(abortSignal);
                    const result = await this.calendarService.list({ pageSize: 100 });
                    return result.data;
                },
                { fallback: [], logMessage: 'Failed to load calendar:' },
            ),
    });

    readonly events = computed(() => this.eventsResource.value() ?? []);

    readonly monthCells = computed((): CalendarDayCell[] => {
        const month = this.visibleMonth();
        const start = startOfWeek(startOfMonth(month));
        const end = endOfWeek(endOfMonth(month));
        const days = eachDayOfInterval({ start, end });
        const allEvents = this.events();

        return days.map((date) => ({
            date,
            inMonth: isSameMonth(date, month),
            isToday: isToday(date),
            events: allEvents.filter((e) => isSameDay(new Date(e.startsAt), date)),
        }));
    });

    readonly monthLabel = computed(() => format(this.visibleMonth(), 'MMMM yyyy'));

    readonly selectedLabel = computed(() => format(this.selectedDate(), 'EEEE, MMM d'));

    readonly agendaEvents = computed(() => {
        const selected = this.selectedDate();
        return this.events()
            .filter((e) => isSameDay(new Date(e.startsAt), selected))
            .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    });

    isSelectedDay(date: Date): boolean {
        return isSameDay(date, this.selectedDate());
    }

    formatTime(value: string): string {
        return formatEnterpriseDate(value) + ' ' + format(new Date(value), 'h:mm a');
    }

    previousMonth(): void {
        this.visibleMonth.update((m) => subMonths(m, 1));
    }

    nextMonth(): void {
        this.visibleMonth.update((m) => addMonths(m, 1));
    }

    goToday(): void {
        const today = new Date();
        this.visibleMonth.set(startOfMonth(today));
        this.selectedDate.set(today);
    }

    async createEvent(): Promise<void> {
        const userId = this.authService.currentUser()?.id;
        const start = this.selectedDate();
        start.setHours(10, 0, 0, 0);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        this.creating.set(true);
        try {
            await this.calendarService.create({
                ...(userId ? { userId } : {}),
                title: 'Team sync',
                type: 'MEETING',
                startsAt: start.toISOString(),
                endsAt: end.toISOString(),
            });
            this.eventsResource.reload();
            this.toastService.success('Scheduled', 'Event added to calendar.');
        } catch {
            this.toastService.show({
                title: 'Failed',
                description: 'Could not create event.',
                variant: 'destructive',
            });
        } finally {
            this.creating.set(false);
        }
    }
}

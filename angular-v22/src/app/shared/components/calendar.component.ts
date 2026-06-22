/**
 * Calendar — shadcn-style month grid (used by date picker)
 */

import { Component, computed, effect, input, output, signal } from '@angular/core';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    isToday,
    parse,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns';

import { IconComponent } from './icon.component';

export interface CalendarDay {
    date: Date;
    label: string;
    inMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    isDisabled: boolean;
}

@Component({
    selector: 'app-calendar',
    imports: [IconComponent],
    host: {
        class: 'block',
    },
    template: `
        <div class="calendar">
            <div class="calendar-header">
                <button
                    type="button"
                    class="calendar-nav-btn"
                    aria-label="Previous month"
                    (click)="previousMonth()"
                >
                    <app-icon name="chevron-left" [size]="16" />
                </button>
                <div class="calendar-caption">{{ monthLabel() }}</div>
                <button
                    type="button"
                    class="calendar-nav-btn"
                    aria-label="Next month"
                    (click)="nextMonth()"
                >
                    <app-icon name="chevron-right" [size]="16" />
                </button>
            </div>

            <div class="calendar-weekdays" aria-hidden="true">
                @for (weekday of weekdays; track weekday) {
                    <span class="calendar-weekday">{{ weekday }}</span>
                }
            </div>

            <div class="calendar-grid" role="grid" aria-label="Calendar">
                @for (day of days(); track day.date.toISOString()) {
                    <button
                        type="button"
                        role="gridcell"
                        class="calendar-day"
                        [class.calendar-day-outside]="!day.inMonth"
                        [class.calendar-day-today]="day.isToday"
                        [class.calendar-day-selected]="day.isSelected"
                        [disabled]="day.isDisabled"
                        [attr.aria-selected]="day.isSelected"
                        [attr.aria-label]="day.label"
                        (click)="selectDay(day)"
                    >
                        {{ day.date.getDate() }}
                    </button>
                }
            </div>
        </div>
    `,
})
export class CalendarComponent {
    readonly weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    selected = input<string>('');
    min = input<string>('');
    max = input<string>('');

    dateSelect = output<string>();

    private readonly viewMonth = signal(startOfMonth(new Date()));

    monthLabel = computed(() => format(this.viewMonth(), 'MMMM yyyy'));

    days = computed(() => {
        const month = this.viewMonth();
        const selectedDate = this.parseBoundary(this.selected());
        const minDate = this.parseBoundary(this.min());
        const maxDate = this.parseBoundary(this.max());

        const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
        const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });

        return eachDayOfInterval({ start, end }).map((date): CalendarDay => {
            const disabled =
                (minDate !== null && date < this.stripTime(minDate)) ||
                (maxDate !== null && date > this.stripTime(maxDate));

            return {
                date,
                label: format(date, 'EEEE, MMMM d, yyyy'),
                inMonth: isSameMonth(date, month),
                isToday: isToday(date),
                isSelected: selectedDate !== null && isSameDay(date, selectedDate),
                isDisabled: disabled,
            };
        });
    });

    constructor() {
        effect(() => {
            const selected = this.selected();
            if (selected) {
                this.syncViewToSelection(selected);
            }
        });
    }

    syncViewToSelection(value: string): void {
        const parsed = this.parseBoundary(value);
        if (parsed) {
            this.viewMonth.set(startOfMonth(parsed));
        }
    }

    previousMonth(): void {
        this.viewMonth.update((current) => subMonths(current, 1));
    }

    nextMonth(): void {
        this.viewMonth.update((current) => addMonths(current, 1));
    }

    selectDay(day: CalendarDay): void {
        if (day.isDisabled) return;
        this.dateSelect.emit(format(day.date, 'yyyy-MM-dd'));
    }

    private parseBoundary(value: string): Date | null {
        if (!value?.trim()) return null;
        const parsed = parse(value.slice(0, 10), 'yyyy-MM-dd', new Date());
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    private stripTime(date: Date): Date {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
}

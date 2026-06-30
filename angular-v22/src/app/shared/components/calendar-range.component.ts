/**
 * Calendar Range — shadcn-style dual-month range selection
 */

import { Component, computed, effect, input, output, signal } from '@angular/core';
import {
    DateRangeValue,
    isDayInRangeSelection,
    normalizeDateRange,
    parseIsoDate,
    toIsoDateString,
} from '@utils/date.util';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameMonth,
    isToday,
    parse,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns';

import { IconComponent } from './icon.component';

export interface CalendarRangeDay {
    date: Date;
    label: string;
    inMonth: boolean;
    isToday: boolean;
    isDisabled: boolean;
    rangeRole: 'none' | 'start' | 'end' | 'middle' | 'single';
}

@Component({
    selector: 'app-calendar-range',
    imports: [IconComponent],
    host: {
        class: 'block',
    },
    template: `
        <div class="calendar-range">
            <div class="calendar-range-header">
                <button
                    type="button"
                    class="calendar-nav-btn"
                    aria-label="Previous month"
                    (click)="previousMonth()"
                >
                    <app-icon name="chevron-left" [size]="16" />
                </button>
                <div class="calendar-range-captions">
                    <span class="calendar-caption">{{ leftMonthLabel() }}</span>
                    <span class="calendar-caption calendar-range-caption-right">{{
                        rightMonthLabel()
                    }}</span>
                </div>
                <button
                    type="button"
                    class="calendar-nav-btn"
                    aria-label="Next month"
                    (click)="nextMonth()"
                >
                    <app-icon name="chevron-right" [size]="16" />
                </button>
            </div>

            <div class="calendar-range-months">
                @for (month of visibleMonths(); track month.toISOString()) {
                    <div class="calendar-range-month">
                        <div class="calendar-weekdays" aria-hidden="true">
                            @for (weekday of weekdays; track weekday) {
                                <span class="calendar-weekday">{{ weekday }}</span>
                            }
                        </div>
                        <div class="calendar-grid" role="grid" [attr.aria-label]="monthLabel(month)">
                            @for (day of daysForMonth(month); track day.date.toISOString()) {
                                <button
                                    type="button"
                                    role="gridcell"
                                    class="calendar-day"
                                    [class.calendar-day-outside]="!day.inMonth"
                                    [class.calendar-day-today]="day.isToday"
                                    [class.calendar-day-range-start]="day.rangeRole === 'start'"
                                    [class.calendar-day-range-end]="day.rangeRole === 'end'"
                                    [class.calendar-day-range-middle]="day.rangeRole === 'middle'"
                                    [class.calendar-day-selected]="day.rangeRole === 'single'"
                                    [disabled]="day.isDisabled"
                                    [attr.aria-selected]="day.rangeRole !== 'none'"
                                    [attr.aria-label]="day.label"
                                    (click)="selectDay(day)"
                                >
                                    {{ day.date.getDate() }}
                                </button>
                            }
                        </div>
                    </div>
                }
            </div>
        </div>
    `,
})
export class CalendarRangeComponent {
    readonly weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    from = input<string>('');
    to = input<string>('');
    min = input<string>('');
    max = input<string>('');

    rangeSelect = output<DateRangeValue>();

    private readonly viewMonth = signal(startOfMonth(new Date()));

    leftMonthLabel = computed(() => format(this.viewMonth(), 'MMMM yyyy'));
    rightMonthLabel = computed(() => format(addMonths(this.viewMonth(), 1), 'MMMM yyyy'));

    visibleMonths = computed(() => [this.viewMonth(), addMonths(this.viewMonth(), 1)]);

    constructor() {
        effect(() => {
            const range = normalizeDateRange(this.from(), this.to());
            if (range.from) {
                this.syncViewToSelection(range.from);
            }
        });
    }

    syncViewToSelection(value: string): void {
        const parsed = parseIsoDate(value);
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

    monthLabel(month: Date): string {
        return format(month, 'MMMM yyyy');
    }

    daysForMonth(month: Date): CalendarRangeDay[] {
        const fromDate = parseIsoDate(this.from());
        const toDate = parseIsoDate(this.to());
        const minDate = this.parseBoundary(this.min());
        const maxDate = this.parseBoundary(this.max());

        const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
        const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });

        return eachDayOfInterval({ start, end }).map((date): CalendarRangeDay => {
            const disabled =
                (minDate !== null && date < this.stripTime(minDate)) ||
                (maxDate !== null && date > this.stripTime(maxDate));

            return {
                date,
                label: format(date, 'EEEE, MMMM d, yyyy'),
                inMonth: isSameMonth(date, month),
                isToday: isToday(date),
                isDisabled: disabled,
                rangeRole: isDayInRangeSelection(date, fromDate, toDate),
            };
        });
    }

    selectDay(day: CalendarRangeDay): void {
        if (day.isDisabled) return;

        const clicked = toIsoDateString(day.date);
        const currentFrom = this.from();
        const currentTo = this.to();

        if (!currentFrom || (currentFrom && currentTo)) {
            this.rangeSelect.emit({ from: clicked, to: '' });
            return;
        }

        this.rangeSelect.emit(normalizeDateRange(currentFrom, clicked));
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

/**
 * Date Range Picker — shadcn-style popover with presets + dual calendar
 */

import { FlexibleConnectedPositionStrategy, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import {
    Component,
    computed,
    DestroyRef,
    ElementRef,
    forwardRef,
    inject,
    input,
    output,
    signal,
    TemplateRef,
    viewChild,
    ViewContainerRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
    DateRangeValue,
    EMPTY_DATE_RANGE,
    formatDisplayDateRange,
    getDefaultDateRangePresets,
    isCompleteDateRange,
    normalizeDateRange,
} from '@utils/date.util';
import { Subscription } from 'rxjs';

import { CalendarRangeComponent } from './calendar-range.component';
import { IconComponent } from './icon.component';

@Component({
    selector: 'app-date-range-picker',
    imports: [IconComponent, CalendarRangeComponent],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => DateRangePickerComponent),
            multi: true,
        },
    ],
    host: {
        class: 'block',
        '[class.date-range-picker-compact]': 'compact()',
    },
    template: `
        <div class="form-group">
            @if (label()) {
                <label [for]="id()" class="form-label">
                    {{ label() }}
                    @if (required()) {
                        <span class="form-label-required" aria-hidden="true">*</span>
                    }
                </label>
            }
            <button
                #trigger
                type="button"
                [id]="id()"
                class="date-picker-trigger date-range-picker-trigger"
                [class.date-picker-trigger-invalid]="hasError()"
                [class.date-picker-trigger-placeholder]="!hasValue()"
                [disabled]="isDisabled()"
                [attr.aria-label]="ariaLabel() || label() || 'Pick a date range'"
                [attr.aria-expanded]="open()"
                aria-haspopup="dialog"
                (click)="onTriggerClick($event)"
            >
                <span class="date-picker-value">{{ displayValue() }}</span>
                <app-icon name="calendar" [size]="16" className="date-picker-icon shrink-0" />
            </button>
            @if (hasError() && error()) {
                <div class="form-error">{{ error() }}</div>
            }
            @if (hint() && !hasError()) {
                <small class="text-muted-foreground mt-1.5 block text-sm">{{ hint() }}</small>
            }
        </div>

        <ng-template #popoverTemplate>
            <div class="date-range-picker-popover" (mousedown)="$event.preventDefault()">
                <div class="date-range-picker-layout">
                    <div class="date-range-presets" role="listbox" aria-label="Date presets">
                        @for (preset of presets; track preset.label) {
                            <button
                                type="button"
                                class="date-range-preset-btn"
                                role="option"
                                [class.date-range-preset-btn-active]="isPresetActive(preset.label)"
                                (click)="applyPreset(preset.label)"
                            >
                                {{ preset.label }}
                            </button>
                        }
                    </div>
                    <app-calendar-range
                        [from]="draftRange().from"
                        [to]="draftRange().to"
                        [min]="min()"
                        [max]="max()"
                        (rangeSelect)="onRangeSelect($event)"
                    />
                </div>
            </div>
        </ng-template>
    `,
})
export class DateRangePickerComponent implements ControlValueAccessor {
    private readonly overlay = inject(Overlay);
    private readonly viewContainerRef = inject(ViewContainerRef);
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);

    private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
    private readonly popoverTemplate = viewChild.required<TemplateRef<unknown>>('popoverTemplate');

    private overlayRef: OverlayRef | null = null;
    private outsidePointerHandler: ((event: PointerEvent) => void) | null = null;
    private outsideListenerTimeout: ReturnType<typeof setTimeout> | null = null;
    private keydownSubscription: Subscription | null = null;

    readonly presets = getDefaultDateRangePresets();

    id = input('');
    label = input('');
    placeholder = input('Pick a date range');
    required = input(false);
    error = input<string | null>(null);
    hint = input('');
    ariaLabel = input('');
    min = input('');
    max = input('');
    closeOnComplete = input(true);
    compact = input(false);

    blurred = output<void>();
    valueChange = output<DateRangeValue>();

    value = signal<DateRangeValue>(EMPTY_DATE_RANGE);
    draftRange = signal<DateRangeValue>(EMPTY_DATE_RANGE);
    activePreset = signal('');
    open = signal(false);
    isDisabled = signal(false);

    hasError = computed(() => !!this.error());
    hasValue = computed(() => isCompleteDateRange(this.value()));
    displayValue = computed(() => {
        const formatted = formatDisplayDateRange(this.value());
        return formatted || this.placeholder();
    });

    private onChange: (value: DateRangeValue) => void = () => undefined;
    private onTouched: () => void = () => undefined;

    constructor() {
        this.destroyRef.onDestroy(() => this.close());
    }

    onTriggerClick(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        if (this.isDisabled()) return;

        if (this.open()) {
            this.close();
            return;
        }
        this.draftRange.set({ ...this.value() });
        this.activePreset.set('');
        this.openPopover();
    }

    onRangeSelect(range: DateRangeValue): void {
        const normalized = normalizeDateRange(range.from, range.to);
        this.draftRange.set(normalized);
        this.activePreset.set('');

        if (isCompleteDateRange(normalized)) {
            this.commitValue(normalized);
            if (this.closeOnComplete()) {
                this.close();
                this.trigger()?.nativeElement.focus();
            }
        }
    }

    applyPreset(label: string): void {
        const preset = this.presets.find((item) => item.label === label);
        if (!preset) return;

        const range = preset.getValue();
        this.draftRange.set(range);
        this.activePreset.set(label);
        this.commitValue(range);
        this.close();
        this.trigger()?.nativeElement.focus();
    }

    isPresetActive(label: string): boolean {
        return this.activePreset() === label;
    }

    writeValue(value: DateRangeValue | null): void {
        const normalized = normalizeDateRange(value?.from, value?.to);
        this.value.set(normalized);
        this.draftRange.set(normalized);
    }

    registerOnChange(fn: (value: DateRangeValue) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled.set(isDisabled);
        if (isDisabled) this.close();
    }

    private commitValue(next: DateRangeValue): void {
        const normalized = normalizeDateRange(next.from, next.to);
        this.value.set(normalized);
        this.onChange(normalized);
        this.valueChange.emit(normalized);
        this.onTouched();
        this.blurred.emit();
    }

    private openPopover(): void {
        const triggerEl = this.trigger()?.nativeElement;
        if (!triggerEl || this.open()) return;

        const positionStrategy: FlexibleConnectedPositionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(triggerEl)
            .withPositions([
                {
                    originX: 'start',
                    originY: 'bottom',
                    overlayX: 'start',
                    overlayY: 'top',
                    offsetY: 4,
                },
                {
                    originX: 'start',
                    originY: 'top',
                    overlayX: 'start',
                    overlayY: 'bottom',
                    offsetY: -4,
                },
                {
                    originX: 'end',
                    originY: 'bottom',
                    overlayX: 'end',
                    overlayY: 'top',
                    offsetY: 4,
                },
            ])
            .withPush(true)
            .withViewportMargin(8)
            .withGrowAfterOpen(true);

        const triggerWidth = Math.max(triggerEl.offsetWidth, triggerEl.getBoundingClientRect().width, 1);

        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            minWidth: Math.max(triggerWidth, 320),
            panelClass: 'date-picker-overlay-panel',
        });

        const portal = new TemplatePortal(this.popoverTemplate(), this.viewContainerRef);
        this.overlayRef.attach(portal);
        this.open.set(true);

        this.keydownSubscription = this.overlayRef.keydownEvents().subscribe((event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.close();
                triggerEl.focus();
            }
        });

        this.scheduleOutsideListener(triggerEl);
    }

    private close(): void {
        this.clearOutsideListener();
        this.keydownSubscription?.unsubscribe();
        this.keydownSubscription = null;

        if (this.overlayRef) {
            this.overlayRef.dispose();
            this.overlayRef = null;
        }

        this.open.set(false);
    }

    private scheduleOutsideListener(triggerEl: HTMLElement): void {
        this.outsideListenerTimeout = globalThis.setTimeout(() => {
            this.outsideListenerTimeout = null;
            if (!this.open()) return;

            this.outsidePointerHandler = (event: PointerEvent) => {
                const target = event.target as Node;
                if (triggerEl.contains(target)) return;
                if (this.overlayRef?.overlayElement.contains(target)) return;
                this.close();
            };

            this.document.addEventListener('pointerdown', this.outsidePointerHandler, true);
        });
    }

    private clearOutsideListener(): void {
        if (this.outsideListenerTimeout !== null) {
            globalThis.clearTimeout(this.outsideListenerTimeout);
            this.outsideListenerTimeout = null;
        }

        if (this.outsidePointerHandler) {
            this.document.removeEventListener('pointerdown', this.outsidePointerHandler, true);
            this.outsidePointerHandler = null;
        }
    }
}

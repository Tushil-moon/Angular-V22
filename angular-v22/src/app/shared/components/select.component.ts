/**
 * Select — shadcn/Radix-style custom select (trigger + portaled popover)
 */

import { FlexibleConnectedPositionStrategy, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import {
    Component,
    computed,
    DestroyRef,
    effect,
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
import { Subscription } from 'rxjs';

import { IconComponent } from './icon.component';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

@Component({
    selector: 'app-select',
    imports: [IconComponent],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => SelectComponent),
            multi: true,
        },
    ],
    host: {
        class: 'block min-w-0',
        '[class.select-filter]': 'filter()',
    },
    template: `
        <div class="select-root" [class]="wrapperClass()">
            @if (label()) {
                <label [for]="id()" class="form-label">{{ label() }}</label>
            }
            <div class="select-wrap">
                <button
                    #trigger
                    type="button"
                    [id]="id()"
                    class="select-trigger"
                    [class.select-trigger-sm]="size() === 'sm'"
                    [class.select-trigger-invalid]="invalid()"
                    [disabled]="isEffectivelyDisabled()"
                    [attr.aria-label]="ariaLabel() || null"
                    [attr.aria-expanded]="open()"
                    [attr.aria-activedescendant]="activeDescendantId()"
                    aria-haspopup="listbox"
                    (click)="onTriggerClick($event)"
                    (keydown)="onTriggerKeydown($event)"
                    (blur)="onTriggerBlur()"
                >
                    <span class="select-value" [class.text-muted-foreground]="!selectedLabel()">
                        {{ selectedLabel() || placeholder() }}
                    </span>
                    <app-icon name="chevron-down" [size]="16" className="select-trigger-icon" />
                </button>
            </div>
        </div>

        <ng-template #contentTemplate>
            <div
                class="select-content"
                role="listbox"
                [attr.aria-label]="ariaLabel() || label() || null"
                (mousedown)="$event.preventDefault()"
            >
                @for (option of options(); track option.value; let index = $index) {
                    <button
                        type="button"
                        role="option"
                        class="select-item"
                        [id]="optionId(index)"
                        [class.select-item-selected]="option.value === selectedValue()"
                        [class.select-item-focused]="index === focusedIndex()"
                        [attr.aria-selected]="option.value === selectedValue()"
                        [disabled]="option.disabled ?? false"
                        (click)="selectOption(option, $event)"
                        (mouseenter)="focusedIndex.set(index)"
                    >
                        <span class="select-item-indicator">
                            @if (option.value === selectedValue()) {
                                <app-icon name="check" [size]="16" />
                            }
                        </span>
                        <span class="truncate">{{ option.label }}</span>
                    </button>
                }
            </div>
        </ng-template>
    `,
})
export class SelectComponent implements ControlValueAccessor {
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private readonly overlay = inject(Overlay);
    private readonly viewContainerRef = inject(ViewContainerRef);

    private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
    private readonly contentTemplate = viewChild.required<TemplateRef<unknown>>('contentTemplate');

    private overlayRef: OverlayRef | null = null;
    private positionStrategy: FlexibleConnectedPositionStrategy | null = null;
    private outsidePointerHandler: ((event: PointerEvent) => void) | null = null;
    private keydownSubscription: Subscription | null = null;
    private outsideListenerTimeout: ReturnType<typeof setTimeout> | null = null;
    private positionFrame: ReturnType<typeof requestAnimationFrame> | null = null;
    private openGeneration = 0;

    id = input('');
    label = input('');
    placeholder = input('');
    options = input<SelectOption[]>([]);
    wrapperClass = input('');
    ariaLabel = input('');
    size = input<'default' | 'sm'>('default');
    filter = input(false);
    invalid = input(false);
    disabled = input(false);

    value = input<string | undefined>(undefined);
    valueChange = output<string>();

    selectedValue = signal('');
    open = signal(false);
    focusedIndex = signal(0);

    selectedLabel = computed(() => {
        const current = this.selectedValue();
        return this.options().find((option) => option.value === current)?.label ?? '';
    });

    activeDescendantId = computed(() => {
        if (!this.open()) return null;
        return this.optionId(this.focusedIndex());
    });

    private onChange: (value: string) => void = () => undefined;
    private onTouched: () => void = () => undefined;
    private readonly cvaDisabled = signal(false);

    isEffectivelyDisabled = computed(() => this.disabled() || this.cvaDisabled());

    constructor() {
        effect(() => {
            const external = this.value();
            if (external !== undefined) {
                this.selectedValue.set(external);
            }
        });

        this.destroyRef.onDestroy(() => this.close());
    }

    onTriggerClick(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        if (this.isEffectivelyDisabled()) return;

        if (this.open()) {
            this.close();
            return;
        }

        this.openDropdown();
    }

    onTriggerKeydown(event: KeyboardEvent): void {
        if (this.isEffectivelyDisabled()) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (!this.open()) {
                    this.openDropdown();
                } else {
                    this.moveFocus(1);
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (!this.open()) {
                    this.openDropdown();
                } else {
                    this.moveFocus(-1);
                }
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (this.open()) {
                    this.selectFocusedOption();
                } else {
                    this.openDropdown();
                }
                break;
            case 'Escape':
                event.preventDefault();
                this.close();
                break;
            case 'Home':
                event.preventDefault();
                this.focusedIndex.set(this.firstEnabledIndex());
                break;
            case 'End':
                event.preventDefault();
                this.focusedIndex.set(this.lastEnabledIndex());
                break;
            default:
                break;
        }
    }

    onTriggerBlur(): void {
        window.setTimeout(() => {
            if (!this.open()) {
                this.onTouched();
            }
        }, 0);
    }

    selectOption(option: SelectOption, event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        if (option.disabled) return;
        this.setValue(option.value);
        this.close();
        this.trigger()?.nativeElement.focus();
    }

    writeValue(value: string): void {
        this.selectedValue.set(value ?? '');
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.cvaDisabled.set(isDisabled);
    }

    optionId(index: number): string {
        const base = this.id() || 'select';
        return `${base}-option-${index}`;
    }

    private openDropdown(): void {
        if (this.open() || this.isEffectivelyDisabled()) return;

        const triggerRef = this.trigger();
        const triggerEl = triggerRef?.nativeElement;
        if (!triggerEl) return;

        this.cancelPendingWork();
        const generation = this.openGeneration + 1;
        this.openGeneration = generation;

        const selectedIndex = this.options().findIndex(
            (option) => option.value === this.selectedValue(),
        );
        this.focusedIndex.set(selectedIndex >= 0 ? selectedIndex : this.firstEnabledIndex());

        this.positionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(triggerRef)
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
            ])
            .withPush(true)
            .withViewportMargin(8)
            .withGrowAfterOpen(true);

        const triggerRect = triggerEl.getBoundingClientRect();
        const triggerWidth = Math.max(triggerEl.offsetWidth, triggerRect.width, 1);

        this.overlayRef = this.overlay.create({
            positionStrategy: this.positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            width: triggerWidth,
            minWidth: triggerWidth,
            maxHeight: 240,
            panelClass: 'select-overlay-panel',
        });

        const portal = new TemplatePortal(this.contentTemplate(), this.viewContainerRef);
        this.overlayRef.attach(portal);
        this.open.set(true);
        this.syncOverlayPosition(triggerEl, generation);

        this.keydownSubscription = this.overlayRef.keydownEvents().subscribe((event) => {
            if (generation !== this.openGeneration) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                this.close();
                this.trigger()?.nativeElement.focus();
            }
        });

        this.scheduleOutsideListener(triggerEl, generation);
    }

    private scheduleOutsideListener(triggerEl: HTMLElement, generation: number): void {
        this.outsideListenerTimeout = window.setTimeout(() => {
            this.outsideListenerTimeout = null;
            if (generation !== this.openGeneration || !this.open()) return;

            this.outsidePointerHandler = (event: PointerEvent) => {
                if (generation !== this.openGeneration) return;

                const target = event.target as Node;
                if (triggerEl.contains(target)) return;
                if (this.overlayRef?.overlayElement.contains(target)) return;
                this.close();
            };

            this.document.addEventListener('pointerdown', this.outsidePointerHandler, true);
        });
    }

    private syncOverlayPosition(triggerEl: HTMLElement, generation: number): void {
        if (!this.overlayRef) return;

        this.overlayRef.updatePosition();

        this.positionFrame = requestAnimationFrame(() => {
            this.positionFrame = null;
            if (generation !== this.openGeneration || !this.overlayRef) return;

            this.overlayRef.updatePosition();

            const paneRect = this.overlayRef.overlayElement.getBoundingClientRect();
            const triggerRect = triggerEl.getBoundingClientRect();
            const mispositioned =
                paneRect.top <= 1 &&
                paneRect.left <= 1 &&
                (triggerRect.top > 1 || triggerRect.left > 1);

            if (mispositioned) {
                this.positionStrategy?.setOrigin(triggerEl);
                this.overlayRef.updatePosition();
            }
        });
    }

    private cancelPendingWork(): void {
        if (this.outsideListenerTimeout !== null) {
            clearTimeout(this.outsideListenerTimeout);
            this.outsideListenerTimeout = null;
        }

        if (this.positionFrame !== null) {
            cancelAnimationFrame(this.positionFrame);
            this.positionFrame = null;
        }
    }

    private close(): void {
        this.openGeneration += 1;
        this.cancelPendingWork();

        this.keydownSubscription?.unsubscribe();
        this.keydownSubscription = null;

        if (this.outsidePointerHandler) {
            this.document.removeEventListener('pointerdown', this.outsidePointerHandler, true);
            this.outsidePointerHandler = null;
        }

        this.overlayRef?.dispose();
        this.overlayRef = null;
        this.positionStrategy = null;
        this.open.set(false);
    }

    private setValue(next: string): void {
        this.selectedValue.set(next);
        this.onChange(next);
        this.valueChange.emit(next);
    }

    private moveFocus(delta: number): void {
        const items = this.options();
        const count = items.length;
        if (!count) return;

        let index = this.focusedIndex();
        for (const _unused of Array(count)) {
            void _unused;
            index = (index + delta + count) % count;
            if (!items[index]?.disabled) {
                this.focusedIndex.set(index);
                return;
            }
        }
    }

    private selectFocusedOption(): void {
        const option = this.options()[this.focusedIndex()];
        if (option && !option.disabled) {
            this.setValue(option.value);
            this.close();
            this.trigger()?.nativeElement.focus();
        }
    }

    private firstEnabledIndex(): number {
        const index = this.options().findIndex((option) => !option.disabled);
        return Math.max(index, 0);
    }

    private lastEnabledIndex(): number {
        const items = this.options();
        for (let index = items.length - 1; index >= 0; index -= 1) {
            if (!items[index]?.disabled) return index;
        }
        return 0;
    }
}

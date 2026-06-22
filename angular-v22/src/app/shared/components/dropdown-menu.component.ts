/**
 * Dropdown Menu — shadcn-style dropdown (portaled via CDK overlay)
 */

import { FlexibleConnectedPositionStrategy, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import {
    Component,
    DestroyRef,
    ElementRef,
    inject,
    input,
    output,
    signal,
    TemplateRef,
    viewChild,
    ViewContainerRef,
} from '@angular/core';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-dropdown-menu',
    template: `
        <div class="dropdown-root inline-block text-left" #triggerHost>
            <div
                role="button"
                tabindex="0"
                [attr.aria-expanded]="open()"
                aria-haspopup="menu"
                (click)="toggle($event)"
                (keydown.enter)="toggle($event)"
                (keydown.space)="onTriggerSpace($event)"
            >
                <ng-content select="[dropdownTrigger]"></ng-content>
            </div>
        </div>

        <ng-template #menuTemplate>
            <div class="dropdown-content" role="menu" (mousedown)="$event.preventDefault()">
                <ng-content select="[dropdownContent]"></ng-content>
            </div>
        </ng-template>
    `,
})
export class DropdownMenuComponent {
    private readonly overlay = inject(Overlay);
    private readonly viewContainerRef = inject(ViewContainerRef);
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);

    private readonly triggerHost = viewChild<ElementRef<HTMLElement>>('triggerHost');
    private readonly menuTemplate = viewChild.required<TemplateRef<unknown>>('menuTemplate');

    private overlayRef: OverlayRef | null = null;
    private outsidePointerHandler: ((event: PointerEvent) => void) | null = null;
    private outsideListenerTimeout: ReturnType<typeof setTimeout> | null = null;
    private keydownSubscription: Subscription | null = null;

    align = input<'start' | 'end'>('end');
    openChange = output<boolean>();

    open = signal(false);

    constructor() {
        this.destroyRef.onDestroy(() => this.close());
    }

    toggle(event: Event): void {
        event.stopPropagation();
        if (this.open()) {
            this.close();
            return;
        }
        this.openMenu();
    }

    onTriggerSpace(event: Event): void {
        event.preventDefault();
        this.toggle(event);
    }

    close(): void {
        this.clearOutsideListener();
        this.keydownSubscription?.unsubscribe();
        this.keydownSubscription = null;

        if (this.overlayRef) {
            this.overlayRef.dispose();
            this.overlayRef = null;
        }

        this.setOpen(false);
    }

    private openMenu(): void {
        const host = this.triggerHost()?.nativeElement;
        if (!host || this.open()) return;

        const isEnd = this.align() === 'end';
        const originX = isEnd ? 'end' : 'start';
        const overlayX = isEnd ? 'end' : 'start';

        const positionStrategy: FlexibleConnectedPositionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(host)
            .withPositions([
                {
                    originX,
                    originY: 'bottom',
                    overlayX,
                    overlayY: 'top',
                    offsetY: 4,
                },
                {
                    originX,
                    originY: 'top',
                    overlayX,
                    overlayY: 'bottom',
                    offsetY: -4,
                },
            ])
            .withPush(true)
            .withViewportMargin(8)
            .withGrowAfterOpen(true);

        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            panelClass: 'dropdown-overlay-panel',
        });

        const portal = new TemplatePortal(this.menuTemplate(), this.viewContainerRef);
        this.overlayRef.attach(portal);
        this.setOpen(true);

        this.keydownSubscription = this.overlayRef.keydownEvents().subscribe((event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.close();
            }
        });

        this.scheduleOutsideListener(host);
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

    private setOpen(value: boolean): void {
        this.open.set(value);
        this.openChange.emit(value);
    }
}

@Component({
    selector: 'app-dropdown-label',
    template: `<div class="dropdown-label"><ng-content></ng-content></div>`,
})
export class DropdownLabelComponent {}

@Component({
    selector: 'app-dropdown-item',
    template: `
        <button
            type="button"
            role="menuitem"
            class="dropdown-item"
            [class.dropdown-item-destructive]="destructive()"
            [class.dropdown-item-disabled]="disabled()"
            [disabled]="disabled()"
            (click)="handleClick($event)"
        >
            <ng-content></ng-content>
        </button>
    `,
})
export class DropdownItemComponent {
    destructive = input(false);
    disabled = input(false);
    itemClick = output<MouseEvent>();

    handleClick(event: MouseEvent): void {
        if (this.disabled()) return;
        this.itemClick.emit(event);
    }
}

@Component({
    selector: 'app-dropdown-separator',
    template: `<div class="dropdown-separator" role="separator"></div>`,
})
export class DropdownSeparatorComponent {}

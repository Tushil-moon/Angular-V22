/**
 * Sheet Component — shadcn-style slide-over panel (mobile sidebar)
 */

import { isPlatformBrowser } from '@angular/common';
import { Component, effect, inject, input, output, PLATFORM_ID, signal } from '@angular/core';

import { IconComponent } from './icon.component';

@Component({
    selector: 'app-sheet',
    imports: [IconComponent],
    template: `
        @if (open()) {
            <div class="sheet-overlay animate-fadeIn" (click)="close()" aria-hidden="true"></div>
            <div
                class="sheet-content animate-slideInLeft"
                role="dialog"
                aria-modal="true"
                [attr.aria-label]="title()"
            >
                <div class="sheet-header">
                    <h2 class="sheet-title">{{ title() }}</h2>
                    <button
                        type="button"
                        class="btn btn-ghost btn-icon"
                        (click)="close()"
                        aria-label="Close"
                    >
                        <app-icon name="x" [size]="18" />
                    </button>
                </div>
                <div class="sheet-body">
                    <ng-content></ng-content>
                </div>
            </div>
        }
    `,
})
export class SheetComponent {
    private readonly platformId = inject(PLATFORM_ID);

    title = input('Menu');
    isOpen = input(false);
    isOpenChange = output<boolean>();

    open = signal(false);

    constructor() {
        effect(() => {
            this.open.set(this.isOpen());
        });

        effect(() => {
            if (!isPlatformBrowser(this.platformId)) return;
            document.body.style.overflow = this.open() ? 'hidden' : '';
        });
    }

    close(): void {
        this.open.set(false);
        this.isOpenChange.emit(false);
    }
}

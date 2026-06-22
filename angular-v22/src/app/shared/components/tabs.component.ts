/**
 * Tabs — shadcn Tabs (controlled)
 */

import { Component, computed, inject, input, model } from '@angular/core';

@Component({
    selector: 'app-tabs',
    host: { class: 'block w-full' },
    template: `<ng-content />`,
})
export class TabsComponent {
    value = model.required<string>();
}

@Component({
    selector: 'app-tabs-list',
    host: {
        class: 'tabs-list',
        role: 'tablist',
    },
    template: `<ng-content />`,
})
export class TabsListComponent {}

@Component({
    selector: 'app-tabs-trigger',
    host: {
        class: 'flex min-w-0 flex-1',
    },
    template: `
        <button
            type="button"
            role="tab"
            class="tabs-trigger"
            [class.tabs-trigger-active]="active()"
            [attr.aria-selected]="active()"
            [attr.tabindex]="active() ? 0 : -1"
            (click)="select()"
        >
            <ng-content />
        </button>
    `,
})
export class TabsTriggerComponent {
    value = input.required<string>();

    private readonly tabs = inject(TabsComponent);

    active = computed(() => this.tabs.value() === this.value());

    select(): void {
        this.tabs.value.set(this.value());
    }
}

@Component({
    selector: 'app-tabs-content',
    template: `
        @if (active()) {
            <div class="tabs-content" role="tabpanel">
                <ng-content />
            </div>
        }
    `,
})
export class TabsContentComponent {
    value = input.required<string>();

    private readonly tabs = inject(TabsComponent);

    active = computed(() => this.tabs.value() === this.value());
}

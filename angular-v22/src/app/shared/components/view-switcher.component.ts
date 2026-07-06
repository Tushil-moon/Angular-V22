/**
 * Joined icon-only segmented control for view modes (list, cards, etc.)
 */

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'

import type { IconName } from '../icons/app-icons';
import { IconComponent } from './icon.component';

export interface ViewSwitcherOption<T extends string = string> {
    value: T;
    icon: IconName;
    /** Screen-reader label */
    label: string;
}

/** Default list / cards options for enterprise list pages */
export const LIST_CARDS_VIEW_OPTIONS: ViewSwitcherOption<'list' | 'cards'>[] = [
    { value: 'list', icon: 'list', label: 'List view' },
    { value: 'cards', icon: 'layout-grid', label: 'Cards view' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-view-switcher',
    imports: [IconComponent],
    host: {
        class: 'inline-flex shrink-0',
    },
    template: `
        <div class="view-switcher" role="group" [attr.aria-label]="ariaLabel()">
            @for (option of options(); track option.value) {
                <button
                    type="button"
                    class="view-switcher-item"
                    [class.view-switcher-item-active]="value() === option.value"
                    [attr.aria-label]="option.label"
                    [attr.aria-pressed]="value() === option.value"
                    [attr.title]="option.label"
                    (click)="onSelect(option.value)"
                >
                    <app-icon [name]="option.icon" [size]="16" />
                </button>
            }
        </div>
    `,
})
export class ViewSwitcherComponent<T extends string = string> {
    options = input.required<ViewSwitcherOption<T>[]>();
    value = input.required<T>();
    ariaLabel = input('View mode');

    valueChange = output<T>();

    onSelect(next: T): void {
        if (next !== this.value()) {
            this.valueChange.emit(next);
        }
    }
}

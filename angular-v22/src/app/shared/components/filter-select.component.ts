/**
 * Filter Select — toolbar select using shadcn Select styling
 */

import { Component, input, output } from '@angular/core';

import { SelectComponent, SelectOption } from './select.component';

@Component({
    selector: 'app-filter-select',
    imports: [SelectComponent],
    host: { class: 'inline-flex min-w-0' },
    template: `
        <app-select
            [options]="options()"
            [value]="value()"
            [placeholder]="placeholder()"
            [disabled]="disabled()"
            [ariaLabel]="ariaLabel()"
            [filter]="true"
            (valueChange)="valueChange.emit($event)"
        />
    `,
})
export class FilterSelectComponent {
    value = input('');
    options = input<SelectOption[]>([]);
    placeholder = input('');
    disabled = input(false);
    ariaLabel = input('');
    valueChange = output<string>();
}

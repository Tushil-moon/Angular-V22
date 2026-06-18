/**
 * Checkbox — shadcn Checkbox (native styled)
 */

import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
    selector: 'app-checkbox',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => CheckboxComponent),
            multi: true,
        },
    ],
    template: `
        <label class="checkbox-label" [for]="id()">
            <input
                [id]="id()"
                type="checkbox"
                class="checkbox"
                [checked]="checked()"
                [disabled]="isDisabled()"
                (change)="onToggle($event)"
                (blur)="onBlur()"
            />
            @if (label()) {
                <span>{{ label() }}</span>
            }
            <ng-content />
        </label>
    `,
})
export class CheckboxComponent implements ControlValueAccessor {
    id = input('');
    label = input('');

    checked = signal(false);
    isDisabled = signal(false);

    private onChange: (value: boolean) => void = () => undefined;
    private onTouched: () => void = () => undefined;

    onToggle(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.checked.set(target.checked);
        this.onChange(target.checked);
    }

    onBlur(): void {
        this.onTouched();
    }

    writeValue(value: boolean): void {
        this.checked.set(!!value);
    }

    registerOnChange(fn: (value: boolean) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled.set(isDisabled);
    }
}

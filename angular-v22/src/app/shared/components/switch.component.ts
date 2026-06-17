/**
 * Switch — shadcn Switch
 */

import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-switch',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SwitchComponent),
      multi: true,
    },
  ],
  template: `
    <label class="switch-label" [for]="id()">
      <button
        [id]="id()"
        type="button"
        role="switch"
        class="switch"
        [attr.data-state]="checked() ? 'checked' : 'unchecked'"
        [attr.aria-checked]="checked()"
        [disabled]="isDisabled()"
        (click)="toggle()"
        (blur)="onBlur()"
      >
        <span class="switch-thumb" aria-hidden="true"></span>
      </button>
      @if (label()) {
        <span>{{ label() }}</span>
      }
      <ng-content />
    </label>
  `,
})
export class SwitchComponent implements ControlValueAccessor {
  id = input('');
  label = input('');

  checked = signal(false);
  isDisabled = signal(false);

  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  toggle(): void {
    if (this.isDisabled()) return;
    const next = !this.checked();
    this.checked.set(next);
    this.onChange(next);
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

/**
 * Select — shadcn Native Select
 */

import { Component, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="form-group" [class]="wrapperClass()">
      @if (label()) {
        <label [for]="id()" class="form-label">{{ label() }}</label>
      }
      <select
        [id]="id()"
        class="select"
        [class]="selectClass()"
        [disabled]="isDisabled()"
        [value]="value()"
        (change)="onChangeEvent($event)"
        (blur)="onBlur()"
      >
        @if (placeholder()) {
          <option value="" disabled [selected]="!value()">{{ placeholder() }}</option>
        }
        @for (option of options(); track option.value) {
          <option [value]="option.value" [disabled]="option.disabled ?? false">
            {{ option.label }}
          </option>
        }
      </select>
    </div>
  `,
})
export class SelectComponent implements ControlValueAccessor {
  id = input('');
  label = input('');
  placeholder = input('');
  options = input<SelectOption[]>([]);
  wrapperClass = input('');
  selectClass = input('');

  valueChange = output<string>();

  value = signal('');
  isDisabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  onChangeEvent(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.value.set(target.value);
    this.onChange(target.value);
    this.valueChange.emit(target.value);
  }

  onBlur(): void {
    this.onTouched();
  }

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }
}

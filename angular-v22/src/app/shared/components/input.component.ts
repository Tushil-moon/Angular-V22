/**
 * Input Field Component — reactive forms compatible
 */

import { Component, computed, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-input',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="form-group">
      @if (label()) {
        <label [for]="id()" class="form-label">
          {{ label() }}
          @if (required()) {
            <span class="text-destructive">*</span>
          }
        </label>
      }
      <div class="relative">
        <input
          [id]="id()"
          [type]="type()"
          class="input"
          [class.border-destructive]="hasError()"
          [placeholder]="placeholder()"
          [disabled]="isDisabled()"
          [value]="value()"
          (input)="onInput($event)"
          (blur)="onBlur()"
        />
      </div>
      @if (hasError() && error()) {
        <div class="form-error">{{ error() }}</div>
      }
      @if (hint() && !hasError()) {
        <small class="text-muted-foreground block mt-1.5 text-sm">{{ hint() }}</small>
      }
    </div>
  `,
})
export class InputComponent implements ControlValueAccessor {
  id = input('');
  type = input('text');
  label = input('');
  placeholder = input('');
  required = input(false);
  error = input<string | null>(null);
  hint = input('');

  blurred = output<void>();

  value = signal('');
  isDisabled = signal(false);

  hasError = computed(() => !!this.error());

  // ControlValueAccessor defaults until Angular forms registers handlers.
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
    this.onChange(target.value);
  }

  onBlur(): void {
    this.blurred.emit();
    this.onTouched();
  }

  writeValue(value: string): void {
    this.value.set(value || '');
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

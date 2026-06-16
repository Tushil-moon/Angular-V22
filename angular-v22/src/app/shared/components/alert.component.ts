/**
 * Alert Component — shadcn Alert style
 */

import { Component, computed, input, output, signal } from '@angular/core';

export type AlertType = 'success' | 'danger' | 'warning' | 'info';

@Component({
  selector: 'app-alert',
  template: `
    @if (isVisible()) {
      <div [class]="'alert alert-' + type()" role="alert">
        <div class="flex items-start gap-3">
          <div class="flex-1 space-y-1">
            @if (title()) {
              <p class="font-medium leading-none tracking-tight">{{ title() }}</p>
            }
            @if (message()) {
              <p class="text-sm opacity-90">{{ message() }}</p>
            }
          </div>
          @if (dismissible()) {
            <button
              type="button"
              (click)="onDismiss()"
              class="rounded-sm opacity-70 transition-opacity hover:opacity-100 -mr-1 -mt-1 p-1"
              aria-label="Dismiss"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-4 w-4"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class AlertComponent {
  type = input<AlertType>('info');
  title = input('');
  message = input('');
  dismissible = input(true);
  visible = input(true);
  dismissed = output<void>();

  private readonly hidden = signal(false);
  isVisible = computed(() => this.visible() && !this.hidden());

  onDismiss(): void {
    this.hidden.set(true);
    this.dismissed.emit();
  }
}

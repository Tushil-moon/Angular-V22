/**
 * Alert Component — shadcn Alert style
 */

import { Component, computed, input, output, signal } from '@angular/core';
import { IconComponent } from './icon.component';
import type { IconName } from '@shared/icons';

export type AlertType = 'success' | 'danger' | 'warning' | 'info';

const ALERT_ICONS: Record<AlertType, IconName> = {
  success: 'check',
  danger: 'alert-circle',
  warning: 'alert-circle',
  info: 'alert-circle',
};

@Component({
  selector: 'app-alert',
  imports: [IconComponent],
  template: `
    @if (isVisible()) {
      <div [class]="'alert alert-' + type()" role="alert">
        <app-icon [name]="iconName()" [size]="16" className="shrink-0" />
        <div class="flex flex-1 items-start justify-between gap-3">
          <div class="space-y-1">
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
              class="rounded-sm opacity-70 transition-opacity hover:opacity-100 -mr-1 -mt-0.5 p-1"
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
                aria-hidden="true"
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
  iconName = computed(() => ALERT_ICONS[this.type()]);

  onDismiss(): void {
    this.hidden.set(true);
    this.dismissed.emit();
  }
}

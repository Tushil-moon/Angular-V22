/**
 * Toaster Component — shadcn Sonner-style toast host
 */

import { Component, inject } from '@angular/core';
import { ToastService, ToastVariant } from '@services/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toaster',
  imports: [IconComponent],
  template: `
    <div class="toaster-viewport" aria-live="polite" aria-label="Notifications">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast-item animate-slideUp" [class]="variantClass(toast.variant)" role="alert">
          <div class="toast-icon">
            <app-icon [name]="iconName(toast.variant)" [size]="16" />
          </div>
          <div class="toast-content">
            <p class="toast-title">{{ toast.title }}</p>
            @if (toast.description) {
              <p class="toast-description">{{ toast.description }}</p>
            }
          </div>
          <button
            type="button"
            class="toast-close"
            (click)="toastService.dismiss(toast.id)"
            aria-label="Dismiss"
          >
            <app-icon name="x" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToasterComponent {
  toastService = inject(ToastService);

  variantClass(variant?: ToastVariant): string {
    const map: Record<ToastVariant, string> = {
      default: 'toast-default',
      success: 'toast-success',
      destructive: 'toast-destructive',
    };
    return map[variant ?? 'default'];
  }

  iconName(variant?: ToastVariant): 'check' | 'alert-circle' | 'bell' {
    if (variant === 'success') return 'check';
    if (variant === 'destructive') return 'alert-circle';
    return 'bell';
  }
}

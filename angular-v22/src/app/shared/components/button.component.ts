/**
 * Button Component
 */

import { Component, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

@Component({
  selector: 'app-button',
  template: `
    <button
      [class]="buttonClass()"
      [disabled]="disabled()"
      [type]="type()"
      (click)="clicked.emit($event)"
    >
      <ng-content></ng-content>
    </button>
  `,
})
export class ButtonComponent {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  disabled = input(false);
  type = input<'button' | 'submit' | 'reset'>('button');
  clicked = output<MouseEvent>();

  buttonClass = computed(() => {
    const variants: Record<ButtonVariant, string> = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      destructive: 'btn-destructive',
      outline: 'btn-outline',
      ghost: 'btn-ghost',
      link: 'btn-link',
    };
    const sizes: Record<ButtonSize, string> = {
      sm: 'btn-sm',
      md: '',
      lg: 'btn-lg',
      xl: 'btn-xl',
      icon: 'btn-icon',
    };

    return [
      'btn',
      variants[this.variant()],
      sizes[this.size()],
      this.disabled() ? 'opacity-50 cursor-not-allowed' : '',
    ]
      .filter(Boolean)
      .join(' ');
  });
}

/**
 * Button Component — shadcn/ui v4 variants
 */

import { Component, computed, input, output } from '@angular/core';
import { cn } from '@utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

@Component({
    selector: 'app-button',
    host: {
        class: 'inline-flex',
    },
    template: `
        <button
            [class]="buttonClass()"
            [disabled]="disabled()"
            [type]="type()"
            [attr.form]="form() || null"
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
    form = input('');
    className = input('');
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

        return cn(
            'btn',
            variants[this.variant()],
            sizes[this.size()],
            this.disabled() && 'pointer-events-none opacity-50',
            this.className(),
        );
    });
}

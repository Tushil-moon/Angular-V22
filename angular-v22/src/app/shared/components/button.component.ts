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
        '[class]': 'hostClass()',
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

    hostClass = computed(() => {
        const extra = this.className();
        const stretch = extra.includes('toolbar-btn') || extra.includes('w-full') || extra.includes('btn-full');
        return cn('inline-flex shrink-0 min-w-0', extra, stretch && 'flex w-full');
    });

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

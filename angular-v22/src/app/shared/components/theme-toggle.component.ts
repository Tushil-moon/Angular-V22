/**
 * Theme Toggle — visible light / dark switch
 */

import { Component, computed, inject, input } from '@angular/core';
import { ThemeService } from '@services/theme.service';

import { IconComponent } from './icon.component';

@Component({
    selector: 'app-theme-toggle',
    imports: [IconComponent],
    host: {
        '[class.inline-flex]': '!sidebar() || collapsed()',
        '[class.block]': 'sidebar() && !collapsed()',
        '[class.shrink-0]': '!sidebar() || collapsed()',
        '[class.w-full]': 'sidebar() && !collapsed()',
    },
    template: `
        <button
            type="button"
            class="theme-toggle-btn"
            [class.btn]="!sidebar()"
            [class.btn-outline]="!sidebar()"
            [class.btn-sm]="!sidebar()"
            [class.sidebar-menu-button]="sidebar()"
            [class.w-full]="sidebar()"
            (click)="themeService.toggle()"
            [attr.aria-label]="label()"
            [attr.title]="sidebar() && !showLabel() ? label() : null"
            [attr.aria-pressed]="themeService.isDark()"
        >
            <app-icon [name]="iconName()" [size]="16" className="shrink-0" />
            @if (!sidebar() || showLabel()) {
                <span>{{ actionLabel() }}</span>
            }
        </button>
    `,
})
export class ThemeToggleComponent {
    readonly themeService = inject(ThemeService);
    sidebar = input(false);
    collapsed = input(false);
    showLabel = input(false);

    readonly iconName = computed(() => (this.themeService.isDark() ? 'sun' : 'moon'));
    readonly actionLabel = computed(() => (this.themeService.isDark() ? 'Light' : 'Dark'));
    readonly label = computed(() =>
        this.themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode',
    );
}

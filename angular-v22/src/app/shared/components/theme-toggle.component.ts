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
    '[class.inline-flex]': 'true',
    '[class.shrink-0]': 'true',
    '[class.w-full]': 'sidebar()',
    '[class.justify-start]': 'sidebar()',
  },
  template: `
    <button
      type="button"
      class="btn btn-outline btn-sm theme-toggle-btn"
      [class.sidebar-theme-toggle-btn]="sidebar()"
      (click)="themeService.toggle()"
      [attr.aria-label]="label()"
      [attr.title]="sidebar() ? label() : null"
      [attr.aria-pressed]="themeService.isDark()"
    >
      <app-icon [name]="iconName()" [size]="16" className="shrink-0 text-foreground" />
      @if (!sidebar()) {
        <span>{{ actionLabel() }}</span>
      }
    </button>
  `,
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);
  sidebar = input(false);

  readonly iconName = computed(() => (this.themeService.isDark() ? 'sun' : 'moon'));
  readonly actionLabel = computed(() => (this.themeService.isDark() ? 'Light' : 'Dark'));
  readonly label = computed(() =>
    this.themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode',
  );
}

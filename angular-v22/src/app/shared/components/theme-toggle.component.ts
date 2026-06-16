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
    class: 'inline-flex shrink-0',
  },
  template: `
    <button
      type="button"
      class="btn btn-outline btn-sm theme-toggle-btn"
      (click)="themeService.toggle()"
      [attr.aria-label]="label()"
      [attr.aria-pressed]="themeService.isDark()"
    >
      <app-icon [name]="iconName()" [size]="14" className="shrink-0 text-foreground" />
      @if (!compact()) {
        <span>{{ actionLabel() }}</span>
      }
    </button>
  `,
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);
  compact = input(false);

  readonly iconName = computed(() => (this.themeService.isDark() ? 'sun' : 'moon'));
  readonly actionLabel = computed(() => (this.themeService.isDark() ? 'Light' : 'Dark'));
  readonly label = computed(() =>
    this.themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode',
  );
}

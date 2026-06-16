/**
 * Icon Component — thin wrapper around @lucide/angular dynamic icons.
 * Icons are registered centrally via provideAppIcons() in app.config.ts.
 */

import { Component, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import type { IconName } from '@shared/icons';

export type { IconName } from '@shared/icons';

@Component({
  selector: 'app-icon',
  imports: [LucideDynamicIcon],
  template: ` <svg [lucideIcon]="name()" [size]="size()" [class]="className()" /> `,
})
export class IconComponent {
  name = input.required<IconName>();
  size = input(16);
  className = input('');
}

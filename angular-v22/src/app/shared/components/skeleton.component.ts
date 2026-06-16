/**
 * Skeleton Component — shadcn-style loading placeholder
 */

import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  host: { class: 'block' },
  template: `<div [class]="skeletonClass()"></div>`,
})
export class SkeletonComponent {
  className = input('');

  skeletonClass = computed(() => `animate-pulse rounded-md bg-muted ${this.className()}`.trim());
}

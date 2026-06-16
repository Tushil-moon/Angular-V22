/**
 * Loader Component — shadcn Loader2 style
 */

import { Component, computed, input } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

export type LoaderSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-loader',
  template: `
    @if (inline()) {
      <svg
        [class]="iconClass()"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    } @else {
      <div class="flex flex-col items-center justify-center gap-3" [class]="containerClass()">
        <svg
          [class]="iconClass()"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          role="status"
          aria-label="Loading"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        @if (text()) {
          <p class="text-sm text-muted-foreground">{{ text() }}</p>
        }
      </div>
    }
  `,
})
export class LoaderComponent {
  size = input<LoaderSize>('md');
  text = input('');
  inline = input(false);

  iconClass = computed(() => {
    const sizes: Record<LoaderSize, string> = {
      sm: 'h-4 w-4 animate-spin',
      md: 'h-6 w-6 animate-spin text-muted-foreground',
      lg: 'h-8 w-8 animate-spin text-muted-foreground',
    };
    return sizes[this.size()];
  });

  containerClass = computed(() => {
    const sizes: Record<LoaderSize, string> = {
      sm: 'py-4',
      md: 'py-8',
      lg: 'py-16',
    };
    return sizes[this.size()];
  });
}

@Component({
  selector: 'app-skeleton-loader',
  imports: [SkeletonComponent],
  template: `
    <div class="space-y-3">
      @for (_ of items(); track $index) {
        <app-skeleton className="h-4 w-full" />
      }
    </div>
  `,
})
export class SkeletonLoaderComponent {
  itemCount = input(5);

  items = computed(() => Array.from({ length: this.itemCount() }, (_, i) => i));
}

export { SkeletonComponent } from './skeleton.component';

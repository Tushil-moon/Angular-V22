import { Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { SearchService } from '@services/index';
import { IconComponent } from './icon.component';
import { SearchResult } from '@models/index';

@Component({
  selector: 'app-global-search',
  imports: [IconComponent],
  template: `
    <div
      class="relative"
      [class.site-header-search]="variant() === 'header'"
      [class.global-search-drawer]="variant() === 'drawer'"
      #container
    >
      <app-icon name="search" [size]="16" className="site-header-search-icon" />
      <input
        type="search"
        class="site-header-search-input"
        placeholder="Search contacts, deals, companies..."
        aria-label="Global search"
        [value]="query()"
        (input)="onInput($event)"
        (focus)="showResults.set(true)"
        (keydown.escape)="closeResults()"
      />

      @if (showResults() && (results().length > 0 || isSearching())) {
        <div
          class="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-50 max-h-72 overflow-y-auto rounded-md border border-border bg-popover shadow-md"
        >
          @if (isSearching()) {
            <p class="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
          } @else {
            @for (result of results(); track result.type + result.id) {
              <button
                type="button"
                class="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-accent"
                (click)="selectResult(result)"
              >
                <span class="text-sm font-medium text-foreground">{{ result.title }}</span>
                <span class="text-xs text-muted-foreground">
                  {{ resultTypeLabel(result.type) }}
                  @if (result.subtitle) {
                    · {{ result.subtitle }}
                  }
                </span>
              </button>
            }
          }
        </div>
      }
    </div>
  `,
})
export class GlobalSearchComponent {
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);
  private readonly container = viewChild<ElementRef<HTMLElement>>('container');

  /** `header` — inline in site header (hidden below sm). `drawer` — full width in mobile sheet. */
  variant = input<'header' | 'drawer'>('header');

  query = signal('');
  results = signal<SearchResult[]>([]);
  showResults = signal(false);
  isSearching = signal(false);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('click', (event) => {
        const el = this.container()?.nativeElement;
        if (el && !el.contains(event.target as Node)) {
          this.showResults.set(false);
        }
      });
    }
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.showResults.set(true);

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    if (value.trim().length < 2) {
      this.results.set([]);
      this.isSearching.set(false);
      return;
    }

    this.isSearching.set(true);
    this.debounceTimer = setTimeout(() => void this.runSearch(value.trim()), 300);
  }

  closeResults(): void {
    this.showResults.set(false);
  }

  resultTypeLabel(type: SearchResult['type']): string {
    switch (type) {
      case 'contact':
        return 'Contact';
      case 'deal':
        return 'Deal';
      case 'company':
        return 'Company';
      default:
        return type;
    }
  }

  selectResult(result: SearchResult): void {
    this.showResults.set(false);
    this.query.set('');
    this.results.set([]);
    void this.router.navigateByUrl(result.route);
  }

  private async runSearch(term: string): Promise<void> {
    try {
      const results = await this.searchService.search(term, 8);
      this.results.set(results);
    } finally {
      this.isSearching.set(false);
    }
  }
}

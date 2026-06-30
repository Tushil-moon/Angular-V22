import { Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { SearchResult } from '@models/index';
import { SearchService } from '@services/index';
import { ignorePromise } from '@utils/form-display.util';

import { IconComponent } from './icon.component';

@Component({
    selector: 'app-global-search',
    imports: [IconComponent],
    template: `
        <div
            class="global-search"
            [class.global-search-header]="variant() === 'header'"
            [class.global-search-drawer]="variant() === 'drawer'"
            #container
        >
            <div class="search-field">
                <app-icon name="search" [size]="16" className="search-field-icon" />
                <input
                    type="search"
                    class="search-field-input"
                    [placeholder]="placeholder()"
                    aria-label="Global search"
                    [value]="query()"
                    (input)="onInput($event)"
                    (focus)="showResults.set(true)"
                    (keydown.escape)="closeResults()"
                />
            </div>

            @if (showResults() && (results().length > 0 || isSearching())) {
                <div class="global-search-results">
                    @if (isSearching()) {
                        <p class="px-2 py-1.5 text-sm text-muted-foreground">Searching...</p>
                    } @else {
                        @for (result of results(); track result.type + result.id) {
                            <button
                                type="button"
                                class="dropdown-item flex-col items-start gap-0.5"
                                (click)="selectResult(result)"
                            >
                                <span class="text-sm font-medium text-foreground">{{
                                    result.title
                                }}</span>
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

    placeholder = input('Search…');

    query = signal('');
    results = signal<SearchResult[]>([]);
    showResults = signal(false);
    isSearching = signal(false);

    private debounceTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        if (typeof document !== 'undefined') {
            document.addEventListener('click', (event) => {
                const el = this.container()?.nativeElement;
                const target = event.target;
                if (el && target instanceof Node && !el.contains(target)) {
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
        this.debounceTimer = setTimeout(() => {
            ignorePromise(this.runSearch(value.trim()));
        }, 300);
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
        ignorePromise(this.router.navigateByUrl(result.route));
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

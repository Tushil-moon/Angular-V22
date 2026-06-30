/**
 * Search Input — debounced search field with consistent sizing
 */

import { Component, DestroyRef, inject, input, OnInit, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { IconComponent } from './icon.component';

@Component({
    selector: 'app-search-input',
    host: {
        class: 'search-input-host',
    },
    imports: [ReactiveFormsModule, IconComponent],
    template: `
        <div class="search-field">
            <app-icon name="search" [size]="16" className="search-field-icon" />
            <input
                type="search"
                class="search-field-input"
                [placeholder]="placeholder()"
                [attr.aria-label]="ariaLabel() || placeholder()"
                [formControl]="control"
            />
        </div>
    `,
})
export class SearchInputComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);

    placeholder = input('Search...');
    ariaLabel = input('');
    debounceMs = input(300);
    initialValue = input('');

    searchChange = output<string>();

    readonly control = new FormControl('', { nonNullable: true });

    ngOnInit(): void {
        this.control.setValue(this.initialValue(), { emitEvent: false });

        this.control.valueChanges
            .pipe(
                debounceTime(this.debounceMs()),
                distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((value) => this.searchChange.emit(value));
    }
}

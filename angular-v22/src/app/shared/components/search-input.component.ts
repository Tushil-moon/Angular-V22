/**
 * Search Input — debounced search field
 */

import { Component, DestroyRef, inject, input, OnInit, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
    selector: 'app-search-input',
    imports: [ReactiveFormsModule],
    template: `
        <input
            type="text"
            class="input w-full sm:w-64"
            [placeholder]="placeholder()"
            [formControl]="control"
        />
    `,
})
export class SearchInputComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);

    placeholder = input('Search...');
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

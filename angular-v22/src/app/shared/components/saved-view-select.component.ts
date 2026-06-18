import { Component, computed, inject, input, output, resource, signal } from '@angular/core';
import { SavedView } from '@models/index';
import { SavedViewService } from '@services/index';

import { ButtonComponent } from './button.component';
import { FilterSelectComponent } from './filter-select.component';
import { IconComponent } from './icon.component';
import { SelectOption } from './select.component';

@Component({
    selector: 'app-saved-view-select',
    imports: [ButtonComponent, FilterSelectComponent, IconComponent],
    template: `
        <div class="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            <app-filter-select
                class="w-full min-w-0 sm:w-auto"
                [value]="selectedId()"
                [options]="viewOptions()"
                placeholder="All records"
                ariaLabel="Saved views"
                (valueChange)="onSelectValue($event)"
            />

            @if (canSave()) {
                <app-button
                    variant="outline"
                    size="sm"
                    type="button"
                    class="w-full sm:w-auto"
                    (clicked)="saveCurrentView()"
                >
                    <app-icon name="check" [size]="14" />
                    Save view
                </app-button>
            }
        </div>
    `,
})
export class SavedViewSelectComponent {
    private readonly savedViewService = inject(SavedViewService);

    entityType = input.required<SavedView['entityType']>();
    currentFilters = input<Record<string, unknown>>({});
    canSave = input(false);

    viewSelected = output<Record<string, unknown> | null>();
    viewSaved = output<void>();

    selectedId = signal('');

    readonly viewsResource = resource({
        params: () => ({ entityType: this.entityType() }),
        loader: async ({ params }) => this.savedViewService.listViews(params.entityType),
    });

    readonly views = computed(() => this.viewsResource.value() ?? []);

    readonly viewOptions = computed<SelectOption[]>(() => [
        { value: '', label: 'All records' },
        ...this.views().map((view) => ({ value: view.id, label: view.name })),
    ]);

    onSelectValue(id: string): void {
        this.selectedId.set(id);
        if (!id) {
            this.viewSelected.emit(null);
            return;
        }
        const view = this.views().find((item) => item.id === id);
        this.viewSelected.emit(view?.filters ?? null);
    }

    async saveCurrentView(): Promise<void> {
        const name = globalThis.prompt('Name this view');
        if (!name?.trim()) return;

        const view = await this.savedViewService.createView({
            entityType: this.entityType(),
            name: name.trim(),
            filters: this.currentFilters(),
        });

        if (view) {
            this.selectedId.set(view.id);
            this.viewsResource.reload();
            this.viewSaved.emit();
        }
    }
}

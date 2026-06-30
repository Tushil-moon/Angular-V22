/**
 * Saved Views Picker — load, apply, and save list filter presets
 */

import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { SavedView, SavedViewEntityType, SavedViewFilters } from '@models/index';
import { SavedViewService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    DropdownItemComponent,
    DropdownMenuComponent,
    DropdownSeparatorComponent,
} from '@shared/components/dropdown-menu.component';
import { ignorePromise } from '@utils/form-display.util';

import { ButtonComponent } from './button.component';
import { IconComponent } from './icon.component';

@Component({
    selector: 'app-saved-views-picker',
    imports: [
        ButtonComponent,
        IconComponent,
        DropdownMenuComponent,
        DropdownItemComponent,
        DropdownSeparatorComponent,
    ],
    template: `
        <app-dropdown-menu #savedViewsMenu align="end">
            <app-button
                dropdownTrigger
                variant="outline"
                size="sm"
                type="button"
                [disabled]="loading()"
            >
                <app-icon name="bookmark" [size]="14" />
                <span class="hidden sm:inline">Views</span>
                @if (activeViewName()) {
                    <span class="hidden md:inline text-muted-foreground">· {{ activeViewName() }}</span>
                }
            </app-button>
            <div dropdownContent>
                @if (views().length === 0) {
                    <p class="px-2 py-1.5 text-sm text-muted-foreground">No saved views yet</p>
                } @else {
                    @for (view of views(); track view.id) {
                        <app-dropdown-item (itemClick)="applyView(view, savedViewsMenu)">
                            <app-icon name="bookmark" [size]="14" />
                            {{ view.name }}
                            @if (view.isDefault) {
                                <span class="ml-auto text-xs text-muted-foreground">Default</span>
                            }
                        </app-dropdown-item>
                    }
                }
                <app-dropdown-separator />
                <app-dropdown-item (itemClick)="saveCurrentView(savedViewsMenu)">
                    <app-icon name="plus" [size]="14" />
                    Save current filters
                </app-dropdown-item>
                @if (activeViewId()) {
                    <app-dropdown-item (itemClick)="setDefaultView(savedViewsMenu)">
                        <app-icon name="bookmark" [size]="14" />
                        Set as default
                    </app-dropdown-item>
                    <app-dropdown-item
                        [destructive]="true"
                        (itemClick)="deleteActiveView(savedViewsMenu)"
                    >
                        <app-icon name="trash-2" [size]="14" />
                        Delete active view
                    </app-dropdown-item>
                }
                <app-dropdown-item (itemClick)="clearFilters(savedViewsMenu)">
                    <app-icon name="x" [size]="14" />
                    Clear filters
                </app-dropdown-item>
            </div>
        </app-dropdown-menu>
    `,
})
export class SavedViewsPickerComponent implements OnInit {
    private readonly savedViewService = inject(SavedViewService);
    private readonly toastService = inject(ToastService);

    entityType = input.required<SavedViewEntityType>();
    filters = input.required<SavedViewFilters>();

    filtersChange = output<SavedViewFilters>();
    viewApplied = output<SavedView | null>();

    views = signal<SavedView[]>([]);
    loading = signal(false);
    activeViewId = signal<string | null>(null);

    activeViewName = () => {
        const id = this.activeViewId();
        if (!id) return null;
        return this.views().find((view) => view.id === id)?.name ?? null;
    };

    ngOnInit(): void {
        ignorePromise(this.loadViews());
    }

    async loadViews(): Promise<void> {
        this.loading.set(true);
        try {
            const views = await this.savedViewService.listSavedViews(this.entityType());
            this.views.set(views);
            const defaultView = views.find((view) => view.isDefault);
            if (defaultView && !this.activeViewId()) {
                this.applyView(defaultView);
            }
        } catch {
            this.views.set([]);
        } finally {
            this.loading.set(false);
        }
    }

    applyView(view: SavedView, menu?: DropdownMenuComponent): void {
        menu?.close();
        this.activeViewId.set(view.id);
        this.filtersChange.emit(view.filters);
        this.viewApplied.emit(view);
    }

    async saveCurrentView(menu: DropdownMenuComponent): Promise<void> {
        menu.close();
        const name = window.prompt('Name this view');
        if (!name?.trim()) return;

        try {
            const created = await this.savedViewService.createSavedView({
                entityType: this.entityType(),
                name: name.trim(),
                filters: this.filters(),
            });
            if (created) {
                this.views.update((items) => [...items, created].sort((a, b) => a.name.localeCompare(b.name)));
                this.activeViewId.set(created.id);
                this.toastService.success('View saved', `"${created.name}" is ready to reuse.`);
            }
        } catch {
            this.toastService.show({
                title: 'Save failed',
                description: 'Could not save this view.',
                variant: 'destructive',
            });
        }
    }

    async setDefaultView(menu: DropdownMenuComponent): Promise<void> {
        menu.close();
        const id = this.activeViewId();
        if (!id) return;

        try {
            await this.savedViewService.updateSavedView(id, { isDefault: true });
            this.views.update((items) =>
                items.map((view) => ({ ...view, isDefault: view.id === id })),
            );
            this.toastService.success('Default view set', 'This view will load automatically.');
        } catch {
            this.toastService.show({
                title: 'Update failed',
                description: 'Could not set default view.',
                variant: 'destructive',
            });
        }
    }

    async deleteActiveView(menu: DropdownMenuComponent): Promise<void> {
        menu.close();
        const id = this.activeViewId();
        if (!id) return;

        try {
            await this.savedViewService.deleteSavedView(id);
            this.views.update((items) => items.filter((view) => view.id !== id));
            this.activeViewId.set(null);
            this.toastService.success('View deleted', 'Saved view removed.');
        } catch {
            this.toastService.show({
                title: 'Delete failed',
                description: 'Could not delete this view.',
                variant: 'destructive',
            });
        }
    }

    clearFilters(menu: DropdownMenuComponent): void {
        menu.close();
        this.activeViewId.set(null);
        this.filtersChange.emit({});
        this.viewApplied.emit(null);
    }
}

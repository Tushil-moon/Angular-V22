/**
 * Tags Management Page
 */

import { Component, computed, inject, resource, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CrmTag } from '@models/index';
import { AuthService, PermissionService, TagService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    CardBodyComponent,
    CardComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
    IconComponent,
    InputComponent,
    SearchInputComponent,
    SkeletonComponent,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';

const TAG_COLOR_PRESETS = [
    '#6366f1',
    '#8b5cf6',
    '#ec4899',
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#14b8a6',
    '#0ea5e9',
    '#64748b',
] as const;

@Component({
    selector: 'app-tags-list',
    imports: [
        ReactiveFormsModule,
        CardComponent,
        CardHeaderComponent,
        CardTitleComponent,
        CardDescriptionComponent,
        CardBodyComponent,
        ButtonComponent,
        IconComponent,
        SearchInputComponent,
        InputComponent,
        SkeletonComponent,
    ],
    template: `
        <div class="page-shell">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">Tags</h1>
                    <p class="page-description">
                        Organize contacts and deals with colored labels
                    </p>
                </div>
            </div>

            <div class="grid gap-4 lg:grid-cols-3">
                @if (canManage()) {
                    <app-card class="lg:col-span-1">
                        <app-card-header>
                            <app-card-title>Create tag</app-card-title>
                            <app-card-description>Add a new label for CRM records</app-card-description>
                        </app-card-header>
                        <app-card-body contentClass="space-y-4">
                            <form [formGroup]="tagForm" class="space-y-4">
                            <app-input
                                id="tag-name"
                                label="Tag name"
                                formControlName="name"
                                placeholder="e.g. Enterprise"
                            />
                            <div class="space-y-2">
                                <p class="text-sm font-medium text-foreground">Color</p>
                                <div class="flex flex-wrap gap-2">
                                    @for (color of colorPresets; track color) {
                                        <button
                                            type="button"
                                            class="tag-color-swatch"
                                            [class.tag-color-swatch-active]="selectedColor() === color"
                                            [style.background-color]="color"
                                            [attr.aria-label]="'Select color ' + color"
                                            (click)="selectedColor.set(color)"
                                        ></button>
                                    }
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <span
                                    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                                    [style.background-color]="selectedColor() + '22'"
                                    [style.color]="selectedColor()"
                                >
                                    {{ tagForm.controls.name.value || 'Preview' }}
                                </span>
                            </div>
                            <app-button
                                size="sm"
                                type="button"
                                [disabled]="creating() || !tagForm.controls.name.value.trim()"
                                (clicked)="createTag()"
                            >
                                @if (creating()) {
                                    Creating...
                                } @else {
                                    <app-icon name="plus" [size]="14" />
                                    Create tag
                                }
                            </app-button>
                            </form>
                        </app-card-body>
                    </app-card>
                }

                <app-card [class]="canManage() ? 'lg:col-span-2' : 'lg:col-span-3'">
                    <app-card-header [row]="true">
                        <div class="min-w-0 space-y-1">
                            <app-card-title>All tags</app-card-title>
                            <app-card-description>{{ tags().length }} tags in workspace</app-card-description>
                        </div>
                        <app-search-input
                            placeholder="Search tags..."
                            [initialValue]="searchQuery()"
                            (searchChange)="onSearch($event)"
                        />
                    </app-card-header>
                    <app-card-body [flush]="true">
                        @if (isLoading()) {
                            <div class="space-y-3 p-6">
                                @for (_ of skeletonItems; track $index) {
                                    <app-skeleton className="h-12 w-full rounded-lg" />
                                }
                            </div>
                        } @else if (tags().length === 0) {
                            <div class="empty-state py-16">
                                <div class="flex-table-empty-icon" aria-hidden="true">
                                    <app-icon name="tag" [size]="20" className="text-muted-foreground" />
                                </div>
                                <p class="empty-state-title">No tags yet</p>
                                <p class="empty-state-description">
                                    Create tags to label contacts and deals.
                                </p>
                            </div>
                        } @else {
                            <div class="tags-list">
                                @for (tag of tags(); track tag.id) {
                                    <div class="tags-list-row">
                                        <span
                                            class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                                            [style.background-color]="tag.color + '22'"
                                            [style.color]="tag.color"
                                        >
                                            {{ tag.name }}
                                        </span>
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs text-muted-foreground tabular-nums">
                                                {{ tag.color }}
                                            </span>
                                            @if (canManage()) {
                                                <app-button
                                                    size="icon"
                                                    variant="ghost"
                                                    type="button"
                                                    [disabled]="deletingId() === tag.id"
                                                    (clicked)="deleteTag(tag)"
                                                    aria-label="Delete tag"
                                                >
                                                    <app-icon name="trash-2" [size]="14" />
                                                </app-button>
                                            }
                                        </div>
                                    </div>
                                }
                            </div>
                        }
                    </app-card-body>
                </app-card>
            </div>
        </div>
    `,
    styles: `
        .tag-color-swatch {
            @apply h-7 w-7 rounded-full border-2 border-transparent transition-transform hover:scale-110;
        }

        .tag-color-swatch-active {
            @apply border-foreground ring-2 ring-ring ring-offset-2 ring-offset-background;
        }

        .tags-list {
            @apply divide-y divide-border;
        }

        .tags-list-row {
            @apply flex items-center justify-between gap-3 px-6 py-3;
        }
    `,
})
export class TagsListComponent {
    private readonly authService = inject(AuthService);
    private readonly tagService = inject(TagService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(NonNullableFormBuilder);

    tagForm = this.fb.group({ name: [''] });

    readonly colorPresets = TAG_COLOR_PRESETS;
    readonly skeletonItems = Array.from({ length: 4 }, (_, i) => i);

    readonly canManage = computed(
        () =>
            this.permissionService.hasAny(
                Permissions.ManageContacts,
                Permissions.ManageDeals,
            ),
    );

    searchQuery = signal('');
    selectedColor = signal<string>(TAG_COLOR_PRESETS[0]);
    creating = signal(false);
    deletingId = signal<string | null>(null);

    readonly tagsResource = resource({
        params: () => {
            if (!this.authService.isAuthenticated()) return undefined;
            return { search: this.searchQuery().trim() || undefined };
        },
        loader: async ({ params, abortSignal }) => {
            if (!params) return [] as CrmTag[];

            return runResourceLoader(
                async () => {
                    throwIfAborted(abortSignal);
                    return this.tagService.listTags(params.search);
                },
                { fallback: [], logMessage: 'Failed to load tags:' },
            );
        },
    });

    readonly tags = computed(() => this.tagsResource.value() ?? []);
    readonly isLoading = computed(() => this.tagsResource.isLoading());

    onSearch(query: string): void {
        this.searchQuery.set(query);
    }

    async createTag(): Promise<void> {
        const name = this.tagForm.controls.name.value.trim();
        if (!name) return;

        this.creating.set(true);
        try {
            const created = await this.tagService.createTag(name, this.selectedColor());
            if (created) {
                this.tagForm.reset();
                this.tagsResource.reload();
                this.toastService.success('Tag created', `"${created.name}" is ready to use.`);
            }
        } catch {
            this.toastService.show({
                title: 'Create failed',
                description: 'Could not create this tag.',
                variant: 'destructive',
            });
        } finally {
            this.creating.set(false);
        }
    }

    async deleteTag(tag: CrmTag): Promise<void> {
        if (!window.confirm(`Delete tag "${tag.name}"?`)) return;

        this.deletingId.set(tag.id);
        try {
            await this.tagService.deleteTag(tag.id);
            this.tagsResource.reload();
            this.toastService.success('Tag deleted', `"${tag.name}" was removed.`);
        } catch {
            this.toastService.show({
                title: 'Delete failed',
                description: 'Could not delete this tag.',
                variant: 'destructive',
            });
        } finally {
            this.deletingId.set(null);
        }
    }
}

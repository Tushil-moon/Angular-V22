/**
 * Category add / edit dialog — name, slug, hierarchy, status, sort
 */

import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { apiErrorMessage, catalogStatusVariant, slugify } from '@features/shared/admin-list.util';
import { AuthService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    BadgeComponent,
    ButtonComponent,
    DialogComponent,
    IconComponent,
    InputComponent,
    LoaderComponent,
    SelectComponent,
    type SelectOption,
    TextareaComponent,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { DialogRef } from '@shared/dialog/dialog-ref';
import { DIALOG_DATA } from '@shared/dialog/dialog.tokens';
import { forkJoin, of } from 'rxjs';

import type { Category, CategoryStatus, CategoryTreeNode } from '../models/category.model';
import { CategoryApiService } from '../services/category-api.service';
import {
    collectDescendantIds,
    findCategoryNode,
    flattenCategoryOptions,
} from '../utils/category-tree.util';

export interface CategoryFormDialogData {
    categoryId?: string | null;
}

export type CategoryFormDialogResult = 'saved';

interface CategoryFormModel {
    name: string;
    slug: string;
    description: string;
    parentId: string;
    status: CategoryStatus;
    sortOrder: string;
}

const STATUS_OPTIONS: SelectOption[] = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'ARCHIVED', label: 'Archived' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-category-form-dialog',
    imports: [
        DialogComponent,
        ButtonComponent,
        IconComponent,
        BadgeComponent,
        LoaderComponent,
        InputComponent,
        TextareaComponent,
        SelectComponent,
    ],
    template: `
        <app-dialog
            [title]="title()"
            [description]="description()"
            titleIcon="folder-open"
            size="lg"
            [showFooter]="true"
        >
            @if (isEdit() && loading()) {
                <div dialogHeaderExtra class="flex shrink-0 items-center pt-1">
                    <span
                        class="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                        Loading…
                    </span>
                </div>
            } @else if (isEdit() && loaded()?.status; as status) {
                <div dialogHeaderExtra class="flex shrink-0 items-center pt-1">
                    <app-badge [variant]="statusVariant(status)">{{ status }}</app-badge>
                </div>
            }

            @if (loading()) {
                <div class="flex min-h-48 items-center justify-center py-10">
                    <app-loader />
                </div>
            } @else {
                <form class="dialog-form space-y-4" (submit)="onSubmit($event)">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-input
                            id="category-name"
                            label="Name"
                            placeholder="Category name"
                            [required]="true"
                            [modelValue]="model().name"
                            [error]="fieldError('name')"
                            (valueChange)="onNameChange($event)"
                        />
                        <app-input
                            id="category-slug"
                            label="Slug"
                            placeholder="category-slug"
                            hint="Lowercase letters, numbers, and hyphens"
                            [required]="true"
                            [modelValue]="model().slug"
                            [error]="fieldError('slug')"
                            (valueChange)="onSlugChange($event)"
                        />
                    </div>

                    <app-textarea
                        id="category-description"
                        label="Description"
                        placeholder="Optional description for storefront and admin"
                        [rows]="3"
                        [modelValue]="model().description"
                        (valueChange)="patch({ description: $event })"
                    />

                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-select
                            id="category-parent"
                            label="Parent category"
                            placeholder="No parent (top-level)"
                            [options]="parentOptions()"
                            [value]="model().parentId"
                            [disabled]="!canManage()"
                            (valueChange)="patch({ parentId: $event })"
                        />
                        <app-select
                            id="category-status"
                            label="Status"
                            [options]="statusOptions"
                            [value]="model().status"
                            [disabled]="!canManage()"
                            (valueChange)="onStatusChange($event)"
                        />
                    </div>

                    <app-input
                        id="category-sort"
                        label="Sort order"
                        type="number"
                        placeholder="0"
                        hint="Lower numbers appear first in the tree"
                        [modelValue]="model().sortOrder"
                        [error]="fieldError('sortOrder')"
                        (valueChange)="patch({ sortOrder: $event })"
                    />
                </form>
            }

            <div
                dialogFooter
                class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
                <app-button type="button" variant="ghost" size="toolbar" (clicked)="cancel()">
                    Cancel
                </app-button>
                @if (canManage()) {
                    <app-button
                        type="button"
                        variant="primary"
                        size="toolbar"
                        [disabled]="saving() || loading()"
                        (clicked)="save()"
                    >
                        @if (saving()) {
                            <app-loader size="sm" [inline]="true" />
                            Saving…
                        } @else {
                            <app-icon name="plus-square" [size]="14" />
                            {{ submitLabel() }}
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class CategoryFormDialogComponent implements OnInit {
    readonly data = inject<CategoryFormDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(
        DialogRef<CategoryFormDialogComponent, CategoryFormDialogResult | null>,
    );
    private readonly api = inject(CategoryApiService);
    private readonly auth = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly toast = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly statusOptions = STATUS_OPTIONS;

    readonly categoryId = computed(() => this.data.categoryId ?? null);
    readonly isEdit = computed(() => !!this.categoryId());
    readonly title = computed(() => (this.isEdit() ? 'Edit category' : 'Add category'));
    readonly description = computed(() =>
        this.isEdit()
            ? 'Update name, hierarchy, status, and sort order'
            : 'Create a category for organizing products in the catalog',
    );
    readonly submitLabel = computed(() => (this.isEdit() ? 'Save changes' : 'Create category'));

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageCategories),
    );

    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly loaded = signal<Category | null>(null);
    readonly tree = signal<CategoryTreeNode[]>([]);
    readonly slugTouched = signal(false);
    readonly fieldErrors = signal<Record<string, string>>({});

    readonly model = signal<CategoryFormModel>({
        name: '',
        slug: '',
        description: '',
        parentId: '',
        status: 'DRAFT',
        sortOrder: '0',
    });

    readonly parentOptions = computed(() => {
        const exclude = new Set<string>();
        const id = this.categoryId();
        if (id) {
            const node = findCategoryNode(this.tree(), id);
            if (node) {
                for (const descendantId of collectDescendantIds(node)) {
                    exclude.add(descendantId);
                }
            } else {
                exclude.add(id);
            }
        }
        return flattenCategoryOptions(this.tree(), { excludeIds: exclude });
    });

    ngOnInit(): void {
        if (!this.auth.isAuthenticated()) return;

        const id = this.categoryId();
        this.loading.set(true);

        forkJoin({
            tree: this.api.tree(),
            category: id ? this.api.getById(id) : of(null),
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: ({ tree, category }) => {
                    this.tree.set(tree);
                    if (category) {
                        this.loaded.set(category);
                        this.slugTouched.set(true);
                        this.model.set({
                            name: category.name,
                            slug: category.slug,
                            description: category.description ?? '',
                            parentId: category.parentId ?? '',
                            status: category.status,
                            sortOrder: String(category.sortOrder ?? 0),
                        });
                    }
                    this.loading.set(false);
                },
                error: (error: unknown) => {
                    this.loading.set(false);
                    this.toast.error(apiErrorMessage(error, 'Failed to load category.'));
                },
            });
    }

    statusVariant(status: CategoryStatus) {
        return catalogStatusVariant(status);
    }

    patch(partial: Partial<CategoryFormModel>): void {
        this.model.update((current) => ({ ...current, ...partial }));
    }

    onNameChange(name: string): void {
        this.model.update((current) => ({
            ...current,
            name,
            slug: this.slugTouched() ? current.slug : slugify(name),
        }));
        this.clearError('name');
    }

    onSlugChange(slug: string): void {
        this.slugTouched.set(true);
        this.patch({ slug });
        this.clearError('slug');
    }

    onStatusChange(value: string): void {
        if (value === 'DRAFT' || value === 'PUBLISHED' || value === 'ARCHIVED') {
            this.patch({ status: value });
        }
    }

    cancel(): void {
        this.dialogRef.close(null);
    }

    onSubmit(event: Event): void {
        event.preventDefault();
        this.save();
    }

    save(): void {
        if (!this.canManage() || this.saving() || this.loading()) return;

        const values = this.model();
        const errors: Record<string, string> = {};
        const name = values.name.trim();
        const slug = (values.slug.trim() || slugify(name)).toLowerCase();

        if (!name) errors['name'] = 'Name is required';
        if (!slug) errors['slug'] = 'Slug is required';
        else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            errors['slug'] = 'Use lowercase letters, numbers, and hyphens';
        }

        const sortOrder = Number(values.sortOrder);
        if (values.sortOrder.trim() !== '' && !Number.isFinite(sortOrder)) {
            errors['sortOrder'] = 'Enter a valid number';
        }

        this.fieldErrors.set(errors);
        if (Object.keys(errors).length) return;

        const payload = {
            name,
            slug,
            description: values.description.trim() || null,
            parentId: values.parentId || null,
            status: values.status,
            sortOrder: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
        };

        this.saving.set(true);
        const request$ = this.isEdit()
            ? this.api.update(this.categoryId()!, payload)
            : this.api.create(payload);

        request$.subscribe({
            next: (result) => {
                this.saving.set(false);
                if (!result) {
                    this.toast.error('Unable to save category.');
                    return;
                }
                this.toast.success(this.isEdit() ? 'Category updated' : 'Category created');
                this.dialogRef.close('saved');
            },
            error: (error: unknown) => {
                this.saving.set(false);
                this.toast.error(apiErrorMessage(error, 'Failed to save category.'));
            },
        });
    }

    private clearError(key: string): void {
        this.fieldErrors.update((current) => {
            if (!(key in current)) return current;
            const next = { ...current };
            delete next[key];
            return next;
        });
    }

    fieldError(key: string): string | null {
        return this.fieldErrors()[key] ?? null;
    }
}

/**
 * Collection add / edit dialog
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

import type { Collection, CollectionStatus, CollectionType } from '../models/collection.model';
import { CollectionApiService } from '../services/collection-api.service';

export interface CollectionFormDialogData {
    collectionId?: string | null;
}

export type CollectionFormDialogResult = 'saved';

interface CollectionFormModel {
    name: string;
    slug: string;
    description: string;
    type: CollectionType;
    status: CollectionStatus;
    featured: boolean;
    sortOrder: string;
}

const STATUS_OPTIONS: SelectOption[] = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'ARCHIVED', label: 'Archived' },
];

const TYPE_OPTIONS: SelectOption[] = [
    { value: 'MANUAL', label: 'Manual' },
    { value: 'RULE_BASED', label: 'Rule-based' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-collection-form-dialog',
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
            titleIcon="layers"
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
                            id="collection-name"
                            label="Name"
                            placeholder="Collection name"
                            [required]="true"
                            [modelValue]="model().name"
                            [error]="fieldError('name')"
                            (valueChange)="onNameChange($event)"
                        />
                        <app-input
                            id="collection-slug"
                            label="Slug"
                            placeholder="collection-slug"
                            hint="Lowercase letters, numbers, and hyphens"
                            [required]="true"
                            [modelValue]="model().slug"
                            [error]="fieldError('slug')"
                            (valueChange)="onSlugChange($event)"
                        />
                    </div>

                    <app-textarea
                        id="collection-description"
                        label="Description"
                        placeholder="Optional merchandising copy"
                        [rows]="3"
                        [modelValue]="model().description"
                        (valueChange)="patch({ description: $event })"
                    />

                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-select
                            id="collection-type"
                            label="Type"
                            [options]="typeOptions"
                            [value]="model().type"
                            (valueChange)="onTypeChange($event)"
                        />
                        <app-select
                            id="collection-status"
                            label="Status"
                            [options]="statusOptions"
                            [value]="model().status"
                            (valueChange)="onStatusChange($event)"
                        />
                    </div>

                    <app-input
                        id="collection-sort"
                        label="Sort order"
                        type="number"
                        placeholder="0"
                        hint="Lower numbers appear first"
                        [modelValue]="model().sortOrder"
                        [error]="fieldError('sortOrder')"
                        (valueChange)="patch({ sortOrder: $event })"
                    />

                    <label class="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            class="checkbox"
                            [checked]="model().featured"
                            (change)="onFeaturedChange($event)"
                        />
                        Featured collection
                    </label>
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
export class CollectionFormDialogComponent implements OnInit {
    readonly data = inject<CollectionFormDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(
        DialogRef<CollectionFormDialogComponent, CollectionFormDialogResult | null>,
    );
    private readonly api = inject(CollectionApiService);
    private readonly auth = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly toast = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly statusOptions = STATUS_OPTIONS;
    readonly typeOptions = TYPE_OPTIONS;

    readonly collectionId = computed(() => this.data.collectionId ?? null);
    readonly isEdit = computed(() => !!this.collectionId());
    readonly title = computed(() => (this.isEdit() ? 'Edit collection' : 'Add collection'));
    readonly description = computed(() =>
        this.isEdit()
            ? 'Update merchandising group details and visibility'
            : 'Create a curated product group for your storefront',
    );
    readonly submitLabel = computed(() => (this.isEdit() ? 'Save changes' : 'Create collection'));

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageCollections),
    );

    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly loaded = signal<Collection | null>(null);
    readonly slugTouched = signal(false);
    readonly fieldErrors = signal<Record<string, string>>({});

    readonly model = signal<CollectionFormModel>({
        name: '',
        slug: '',
        description: '',
        type: 'MANUAL',
        status: 'DRAFT',
        featured: false,
        sortOrder: '0',
    });

    ngOnInit(): void {
        if (!this.auth.isAuthenticated()) return;
        const id = this.collectionId();
        if (!id) return;

        this.loading.set(true);
        this.api
            .getById(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (collection) => {
                    if (collection) {
                        this.loaded.set(collection);
                        this.slugTouched.set(true);
                        this.model.set({
                            name: collection.name,
                            slug: collection.slug,
                            description: collection.description ?? '',
                            type: collection.type,
                            status: collection.status,
                            featured: collection.featured,
                            sortOrder: String(collection.sortOrder ?? 0),
                        });
                    }
                    this.loading.set(false);
                },
                error: (error: unknown) => {
                    this.loading.set(false);
                    this.toast.error(apiErrorMessage(error, 'Failed to load collection.'));
                },
            });
    }

    statusVariant(status: CollectionStatus) {
        return catalogStatusVariant(status);
    }

    patch(partial: Partial<CollectionFormModel>): void {
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

    onTypeChange(value: string): void {
        if (value === 'MANUAL' || value === 'RULE_BASED') {
            this.patch({ type: value });
        }
    }

    onFeaturedChange(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.patch({ featured: target.checked });
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
            type: values.type,
            status: values.status,
            featured: values.featured,
            sortOrder: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
        };

        this.saving.set(true);
        const request$ = this.isEdit()
            ? this.api.update(this.collectionId()!, payload)
            : this.api.create(payload);

        request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (result) => {
                this.saving.set(false);
                if (!result) {
                    this.toast.error('Unable to save collection.');
                    return;
                }
                this.toast.success(this.isEdit() ? 'Collection updated' : 'Collection created');
                this.dialogRef.close('saved');
            },
            error: (error: unknown) => {
                this.saving.set(false);
                this.toast.error(apiErrorMessage(error, 'Failed to save collection.'));
            },
        });
    }

    fieldError(key: string): string | null {
        return this.fieldErrors()[key] ?? null;
    }

    private clearError(key: string): void {
        this.fieldErrors.update((current) => {
            if (!(key in current)) return current;
            const next = { ...current };
            delete next[key];
            return next;
        });
    }
}

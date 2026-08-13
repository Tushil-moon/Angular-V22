/**
 * Brand add / edit dialog — name, slug, website, status, sort
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

import type { Brand, BrandStatus } from '../models/brand.model';
import { BrandApiService } from '../services/brand-api.service';

export interface BrandFormDialogData {
    brandId?: string | null;
}

export type BrandFormDialogResult = 'saved';

interface BrandFormModel {
    name: string;
    slug: string;
    description: string;
    website: string;
    status: BrandStatus;
    sortOrder: string;
}

const STATUS_OPTIONS: SelectOption[] = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'ARCHIVED', label: 'Archived' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-brand-form-dialog',
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
            titleIcon="tag"
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
                            id="brand-name"
                            label="Name"
                            placeholder="Brand name"
                            [required]="true"
                            [modelValue]="model().name"
                            [error]="fieldError('name')"
                            (valueChange)="onNameChange($event)"
                        />
                        <app-input
                            id="brand-slug"
                            label="Slug"
                            placeholder="brand-slug"
                            hint="Lowercase letters, numbers, and hyphens"
                            [required]="true"
                            [modelValue]="model().slug"
                            [error]="fieldError('slug')"
                            (valueChange)="onSlugChange($event)"
                        />
                    </div>

                    <app-textarea
                        id="brand-description"
                        label="Description"
                        placeholder="Optional brand story or positioning"
                        [rows]="3"
                        [modelValue]="model().description"
                        (valueChange)="patch({ description: $event })"
                    />

                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-input
                            id="brand-website"
                            label="Website"
                            type="url"
                            placeholder="https://example.com"
                            hint="Public brand or manufacturer URL"
                            [modelValue]="model().website"
                            [error]="fieldError('website')"
                            (valueChange)="patch({ website: $event })"
                        />
                        <app-select
                            id="brand-status"
                            label="Status"
                            [options]="statusOptions"
                            [value]="model().status"
                            [disabled]="!canManage()"
                            (valueChange)="onStatusChange($event)"
                        />
                    </div>

                    <app-input
                        id="brand-sort"
                        label="Sort order"
                        type="number"
                        placeholder="0"
                        hint="Lower numbers appear first in lists"
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
export class BrandFormDialogComponent implements OnInit {
    readonly data = inject<BrandFormDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(
        DialogRef<BrandFormDialogComponent, BrandFormDialogResult | null>,
    );
    private readonly api = inject(BrandApiService);
    private readonly auth = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly toast = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly statusOptions = STATUS_OPTIONS;

    readonly brandId = computed(() => this.data.brandId ?? null);
    readonly isEdit = computed(() => !!this.brandId());
    readonly title = computed(() => (this.isEdit() ? 'Edit brand' : 'Add brand'));
    readonly description = computed(() =>
        this.isEdit()
            ? 'Update brand details, website, and catalog visibility'
            : 'Create a manufacturer or label for your product catalog',
    );
    readonly submitLabel = computed(() => (this.isEdit() ? 'Save changes' : 'Create brand'));

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageBrands),
    );

    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly loaded = signal<Brand | null>(null);
    readonly slugTouched = signal(false);
    readonly fieldErrors = signal<Record<string, string>>({});

    readonly model = signal<BrandFormModel>({
        name: '',
        slug: '',
        description: '',
        website: '',
        status: 'DRAFT',
        sortOrder: '0',
    });

    ngOnInit(): void {
        if (!this.auth.isAuthenticated()) return;

        const id = this.brandId();
        this.loading.set(true);

        forkJoin({
            brand: id ? this.api.getById(id) : of(null),
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: ({ brand }) => {
                    if (brand) {
                        this.loaded.set(brand);
                        this.slugTouched.set(true);
                        this.model.set({
                            name: brand.name,
                            slug: brand.slug,
                            description: brand.description ?? '',
                            website: brand.website ?? '',
                            status: brand.status,
                            sortOrder: String(brand.sortOrder ?? 0),
                        });
                    }
                    this.loading.set(false);
                },
                error: (error: unknown) => {
                    this.loading.set(false);
                    this.toast.error(apiErrorMessage(error, 'Failed to load brand.'));
                },
            });
    }

    statusVariant(status: BrandStatus) {
        return catalogStatusVariant(status);
    }

    patch(partial: Partial<BrandFormModel>): void {
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
        const website = values.website.trim();

        if (!name) errors['name'] = 'Name is required';
        if (!slug) errors['slug'] = 'Slug is required';
        else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            errors['slug'] = 'Use lowercase letters, numbers, and hyphens';
        }

        if (website && !/^https?:\/\/.+/i.test(website)) {
            errors['website'] = 'Enter a valid URL starting with http:// or https://';
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
            website: website || null,
            status: values.status,
            sortOrder: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
        };

        this.saving.set(true);
        const request$ = this.isEdit()
            ? this.api.update(this.brandId()!, payload)
            : this.api.create(payload);

        request$.subscribe({
            next: (result) => {
                this.saving.set(false);
                if (!result) {
                    this.toast.error('Unable to save brand.');
                    return;
                }
                this.toast.success(this.isEdit() ? 'Brand updated' : 'Brand created');
                this.dialogRef.close('saved');
            },
            error: (error: unknown) => {
                this.saving.set(false);
                this.toast.error(apiErrorMessage(error, 'Failed to save brand.'));
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

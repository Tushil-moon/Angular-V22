/**
 * Add / Edit Product — Figma kit Add Product form layout
 */

import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, FormField, required, schema } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    IconComponent,
    InputComponent,
    SelectComponent,
    type SelectOption,
    SubmitButtonComponent,
    TextareaComponent,
} from '@shared/components';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import {
    clearFieldFromErrors,
    ignorePromise,
    resolveFieldError,
    shouldShowFieldError,
} from '@utils/form-display.util';
import { of } from 'rxjs';

import type { Product, ProductStatus, ProductType } from '../models/product.model';
import { ProductApiService } from '../services/product-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-product-form',
    imports: [
        RouterLink,
        FormField,
        InputComponent,
        TextareaComponent,
        SelectComponent,
        SubmitButtonComponent,
        ButtonComponent,
        IconComponent,
    ],
    template: `
        <div class="index-page">
            <div class="index-header">
                <div class="index-header-copy">
                    <h1 class="index-title">{{ pageTitle() }}</h1>
                    <p class="index-subtitle">
                        {{
                            isEdit()
                                ? 'Update catalog product details'
                                : 'Create a new catalog product'
                        }}
                    </p>
                </div>
                <div class="index-actions">
                    <a routerLink="/dashboard/products" class="inline-flex">
                        <app-button variant="outline" size="sm" type="button">
                            Back to products
                        </app-button>
                    </a>
                </div>
            </div>

            @if (isEdit() && isLoadingProduct()) {
                <div class="home-panel p-8">
                    <p class="index-empty-desc">Loading product…</p>
                </div>
            } @else {
                <div class="home-grid !xl:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
                    <section class="home-panel">
                        <div class="home-panel-header">
                            <div>
                                <h2 class="home-panel-title">Product details</h2>
                                <p class="home-panel-desc">
                                    Basic fields required for catalog management
                                </p>
                            </div>
                        </div>
                        <div class="home-panel-pad">
                            <form (submit)="onSubmit($event)" class="space-y-4">
                                <app-input
                                    id="name"
                                    label="Name"
                                    placeholder="Product name"
                                    [formField]="productForm.name"
                                    [required]="true"
                                    [error]="fieldError('name')"
                                    (valueChange)="onFieldInput('name')"
                                />
                                <app-input
                                    id="slug"
                                    label="Slug"
                                    placeholder="product-slug"
                                    [formField]="productForm.slug"
                                    [required]="true"
                                    [error]="fieldError('slug')"
                                    (valueChange)="onFieldInput('slug')"
                                />
                                <app-textarea
                                    id="description"
                                    label="Description"
                                    placeholder="Optional description"
                                    [rows]="4"
                                    [formField]="productForm.description"
                                />
                                <div class="grid gap-4 sm:grid-cols-2">
                                    <app-select
                                        id="status"
                                        label="Status"
                                        placeholder="Select status"
                                        [options]="statusOptions"
                                        [formField]="productForm.status"
                                    />
                                    <app-select
                                        id="type"
                                        label="Type"
                                        placeholder="Select type"
                                        [options]="typeOptions"
                                        [formField]="productForm.type"
                                    />
                                </div>

                                <div class="flex flex-wrap gap-2 pt-2">
                                    <app-submit-button
                                        [label]="isEdit() ? 'Save changes' : 'Add product'"
                                        loadingLabel="Saving..."
                                        [loading]="saving()"
                                    />
                                </div>
                            </form>
                        </div>
                    </section>

                    <aside class="space-y-4">
                        <section class="home-panel">
                            <div class="home-panel-header">
                                <div>
                                    <h2 class="home-panel-title">Publishing tips</h2>
                                    <p class="home-panel-desc">Ship a clean catalog entry</p>
                                </div>
                            </div>
                            <div class="home-link-list">
                                <div class="home-link">
                                    <div class="home-link-icon">
                                        <app-icon name="tag" [size]="16" />
                                    </div>
                                    <div>
                                        <p class="home-link-label">Clear name & slug</p>
                                        <p class="home-link-desc">Use storefront-friendly URLs</p>
                                    </div>
                                </div>
                                <div class="home-link">
                                    <div class="home-link-icon">
                                        <app-icon name="package" [size]="16" />
                                    </div>
                                    <div>
                                        <p class="home-link-label">Pick the right type</p>
                                        <p class="home-link-desc">Simple, variable, or digital</p>
                                    </div>
                                </div>
                                <div class="home-link">
                                    <div class="home-link-icon">
                                        <app-icon name="check" [size]="16" />
                                    </div>
                                    <div>
                                        <p class="home-link-label">Draft first</p>
                                        <p class="home-link-desc">Publish when merchandising is ready</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section class="home-panel p-5">
                            <h2 class="home-panel-title">Quick links</h2>
                            <p class="home-panel-desc mt-1">Jump to related catalog tools</p>
                            <div class="mt-4 flex flex-col gap-2">
                                <a routerLink="/dashboard/categories" class="inline-flex">
                                    <app-button class="w-full" variant="outline" size="sm" type="button">
                                        Categories
                                    </app-button>
                                </a>
                                <a routerLink="/dashboard/inventory" class="inline-flex">
                                    <app-button class="w-full" variant="outline" size="sm" type="button">
                                        Inventory
                                    </app-button>
                                </a>
                            </div>
                        </section>
                    </aside>
                </div>
            }
        </div>
    `,
})
export class ProductFormComponent {
    private readonly productApi = inject(ProductApiService);
    private readonly authService = inject(AuthService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);

    readonly productId = signal(this.route.snapshot.paramMap.get('id'));
    readonly isEdit = computed(() => {
        const id = this.productId();
        return !!id && id !== 'new';
    });
    readonly pageTitle = computed(() => (this.isEdit() ? 'Edit product' : 'Add product'));
    readonly saving = signal(false);
    readonly submitted = signal(false);
    readonly zodErrors = signal<Record<string, string[]>>({});

    private readonly model = signal({
        name: '',
        slug: '',
        description: '',
        status: 'DRAFT' as ProductStatus,
        type: 'SIMPLE' as ProductType,
    });

    readonly productForm = form(
        this.model,
        schema((f) => {
            required(f.name, { message: 'Name is required' });
            required(f.slug, { message: 'Slug is required' });
        }),
    );

    readonly statusOptions: SelectOption[] = [
        { value: 'DRAFT', label: 'Draft' },
        { value: 'PUBLISHED', label: 'Published' },
        { value: 'ARCHIVED', label: 'Archived' },
    ];

    readonly typeOptions: SelectOption[] = [
        { value: 'SIMPLE', label: 'Simple' },
        { value: 'VARIABLE', label: 'Variable' },
        { value: 'DIGITAL', label: 'Digital' },
        { value: 'PHYSICAL', label: 'Physical' },
        { value: 'SUBSCRIPTION', label: 'Subscription' },
        { value: 'BUNDLE', label: 'Bundle' },
    ];

    readonly productResource = rxResource({
        params: () => {
            if (!this.authService.isAuthenticated() || !this.isEdit()) return undefined;
            return { id: this.productId()! };
        },
        stream: ({ params, abortSignal }) => {
            if (!params) {
                return of(null as Product | null);
            }
            throwIfAborted(abortSignal);
            return this.productApi.getById(params.id).pipe(
                catchResourceStreamError<Product | null>({
                    fallback: null,
                    logMessage: 'Failed to load product:',
                }),
            );
        },
    });

    readonly isLoadingProduct = computed(() => this.productResource.isLoading());

    private readonly applyLoadedProduct = effect(() => {
        const product = this.productResource.value();
        if (!product) return;
        this.model.set({
            name: product.name,
            slug: product.slug,
            description: product.description ?? '',
            status: product.status,
            type: product.type,
        });
    });

    fieldError(name: 'name' | 'slug'): string | null {
        const show = shouldShowFieldError({
            touched: false,
            submitted: this.submitted(),
        });
        const zodError = this.zodErrors()[name]?.[0];
        const formError =
            name === 'name'
                ? this.productForm.name().errors()?.[0]?.message
                : this.productForm.slug().errors()?.[0]?.message;
        return resolveFieldError(zodError ?? formError ?? null, show);
    }

    onFieldInput(field: string): void {
        this.zodErrors.update((errors) => clearFieldFromErrors(errors, field));
    }

    onSubmit(event: Event): void {
        event.preventDefault();
        this.submitted.set(true);

        const value = this.model();
        const errors: Record<string, string[]> = {};
        if (!value.name.trim()) errors['name'] = ['Name is required'];
        if (!value.slug.trim()) errors['slug'] = ['Slug is required'];
        if (Object.keys(errors).length) {
            this.zodErrors.set(errors);
            return;
        }

        this.zodErrors.set({});
        this.saving.set(true);

        const payload = {
            name: value.name.trim(),
            slug: value.slug.trim(),
            description: value.description.trim() || null,
            status: value.status,
            type: value.type,
        };

        const request$ = this.isEdit()
            ? this.productApi.update(this.productId()!, payload)
            : this.productApi.create(payload);

        request$.subscribe({
            next: (product) => {
                this.saving.set(false);
                this.toast.success(this.isEdit() ? 'Product updated' : 'Product created');
                if (product) {
                    ignorePromise(this.router.navigate(['/dashboard/products', product.id]));
                } else {
                    ignorePromise(this.router.navigate(['/dashboard/products']));
                }
            },
            error: (error: unknown) => {
                this.saving.set(false);
                const message =
                    error && typeof error === 'object' && 'message' in error
                        ? String((error as { message: string }).message)
                        : 'Failed to save product.';
                this.toast.error(message);
            },
        });
    }
}

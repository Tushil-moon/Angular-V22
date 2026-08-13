/**
 * Product form body — grid fields and save logic for page or dialog hosts.
 */

import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, FormField, required, schema } from '@angular/forms/signals';
import { BrandApiService } from '@features/brands/services/brand-api.service';
import type { CategoryTreeNode } from '@features/categories/models/category.model';
import { CategoryApiService } from '@features/categories/services/category-api.service';
import { MediaApiService } from '@features/media/services/media-api.service';
import { apiErrorMessage } from '@features/shared/admin-list.util';
import { AuthService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    InputComponent,
    SelectComponent,
    type SelectOption,
    SwitchComponent,
    TextareaComponent,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import {
    clearFieldFromErrors,
    resolveFieldError,
    shouldShowFieldError,
} from '@utils/form-display.util';
import { forkJoin, map, of } from 'rxjs';

import { CategoryTreePickerComponent } from './category-tree-picker.component';
import {
    type ProductImageDraft,
    ProductImagesPanelComponent,
} from './product-images-panel.component';
import type { Product, ProductType } from '../models/product.model';
import { ProductApiService } from '../services/product-api.service';
import {
    defaultProductFormValues,
    deriveSlugFromName,
    mapApiValidationErrors,
    parseOptionalNumber,
    type ProductFormField,
    validateProductForm,
} from '../utils/product-form.util';
import { getProductTypeProfile, productTypeOptions } from '../utils/product-type.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-product-form-body',
    imports: [
        FormField,
        InputComponent,
        TextareaComponent,
        SelectComponent,
        ButtonComponent,
        SwitchComponent,
        CategoryTreePickerComponent,
        ProductImagesPanelComponent,
    ],
    template: `
        @if (isEdit() && isLoadingProduct()) {
            <div
                class="flex min-h-[18rem] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20"
            >
                <p class="index-empty-desc">Loading product details…</p>
            </div>
        } @else {
            <form id="product-form" class="min-w-0" (submit)="onSubmit($event)">
                <div
                    class="grid gap-5 pb-1 lg:grid-cols-[minmax(0,1.85fr)_minmax(22rem,1fr)] xl:grid-cols-[minmax(0,1.9fr)_minmax(24rem,1fr)]"
                >
                    <div class="min-w-0 space-y-5">
                        <section class="home-panel shadow-sm">
                            <div class="home-panel-header">
                                <div>
                                    <h2 class="home-panel-title">General</h2>
                                    <p class="home-panel-desc">Core product identity and copy</p>
                                </div>
                            </div>
                            <div class="home-panel-pad space-y-4">
                                <div class="grid gap-4 lg:grid-cols-2">
                                    <app-input
                                        id="name"
                                        label="Name"
                                        placeholder="Product name"
                                        [formField]="productForm.name"
                                        [required]="true"
                                        [error]="fieldError('name')"
                                        (valueChange)="onNameChange($event)"
                                    />
                                    <app-input
                                        id="slug"
                                        label="Slug"
                                        placeholder="product-slug"
                                        hint="Lowercase letters, numbers, and hyphens"
                                        [formField]="productForm.slug"
                                        [required]="true"
                                        [error]="fieldError('slug')"
                                        (valueChange)="onSlugEdited()"
                                    />
                                </div>
                                <app-textarea
                                    id="shortDescription"
                                    label="Short description"
                                    placeholder="Brief summary for cards and search"
                                    [rows]="2"
                                    [formField]="productForm.shortDescription"
                                />
                                <app-textarea
                                    id="description"
                                    label="Description"
                                    placeholder="Full product description"
                                    [rows]="5"
                                    [formField]="productForm.description"
                                />
                                <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    <div>
                                        <app-select
                                            id="type"
                                            label="Product type"
                                            [options]="typeOptions"
                                            [formField]="productForm.type"
                                            (valueChange)="onTypeChange($event)"
                                        />
                                        <p class="form-hint mt-1">
                                            {{ typeProfile().description }}
                                        </p>
                                    </div>
                                    <app-select
                                        id="status"
                                        label="Status"
                                        [options]="statusOptions"
                                        [formField]="productForm.status"
                                    />
                                    <app-select
                                        id="visibility"
                                        label="Visibility"
                                        [options]="visibilityOptions"
                                        [formField]="productForm.visibility"
                                    />
                                </div>
                                <div class="flex flex-wrap items-center gap-6">
                                    <app-switch
                                        id="featured"
                                        label="Featured product"
                                        [formField]="productForm.featured"
                                    />
                                    @if (typeProfile().showInventory) {
                                        <app-switch
                                            id="trackInventory"
                                            label="Track inventory"
                                            [formField]="productForm.trackInventory"
                                        />
                                    }
                                </div>
                            </div>
                        </section>

                        @if (typeProfile().showPricing) {
                            <section class="home-panel shadow-sm">
                                <div class="home-panel-header">
                                    <div>
                                        <h2 class="home-panel-title">Pricing & inventory</h2>
                                        <p class="home-panel-desc">Default variant pricing and SKU</p>
                                    </div>
                                </div>
                                <div class="home-panel-pad space-y-4">
                                    <div class="grid gap-4 sm:grid-cols-2">
                                        <app-input
                                            id="price"
                                            label="Price"
                                            type="number"
                                            placeholder="0.00"
                                            [formField]="productForm.price"
                                            [required]="true"
                                            [error]="fieldError('price')"
                                            (valueChange)="onFieldInput('price')"
                                        />
                                        <app-input
                                            id="compareAtPrice"
                                            label="Compare-at price"
                                            type="number"
                                            placeholder="Optional"
                                            [formField]="productForm.compareAtPrice"
                                            [error]="fieldError('compareAtPrice')"
                                            (valueChange)="onFieldInput('compareAtPrice')"
                                        />
                                    </div>
                                    <div class="grid gap-4 sm:grid-cols-2">
                                        <app-input
                                            id="sku"
                                            label="SKU"
                                            placeholder="SKU-001"
                                            [formField]="productForm.sku"
                                            [required]="true"
                                            [error]="fieldError('sku')"
                                            (valueChange)="onFieldInput('sku')"
                                        />
                                        @if (!isEdit()) {
                                            <app-input
                                                id="initialStock"
                                                label="Initial stock"
                                                type="number"
                                                placeholder="0"
                                                [formField]="productForm.initialStock"
                                                [error]="fieldError('initialStock')"
                                                (valueChange)="onFieldInput('initialStock')"
                                            />
                                        }
                                    </div>
                                </div>
                            </section>
                        } @else if (typeProfile().showVariants && isEdit()) {
                            <section class="home-panel shadow-sm">
                                <div class="home-panel-header">
                                    <div>
                                        <h2 class="home-panel-title">Variants</h2>
                                        <p class="home-panel-desc">
                                            Manage SKUs and prices for this variable product
                                        </p>
                                    </div>
                                </div>
                                <div class="home-panel-pad space-y-4">
                                    @if (loadedProduct()?.variants?.length) {
                                        <div class="overflow-x-auto rounded-xl border border-border">
                                            <table class="w-full text-sm">
                                                <thead class="bg-muted/40 text-left">
                                                    <tr>
                                                        <th class="px-3 py-2 font-medium">SKU</th>
                                                        <th class="px-3 py-2 font-medium">Title</th>
                                                        <th class="px-3 py-2 font-medium">Price</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    @for (
                                                        variant of loadedProduct()!.variants;
                                                        track variant.id
                                                    ) {
                                                        <tr class="border-t border-border">
                                                            <td class="px-3 py-2">{{ variant.sku }}</td>
                                                            <td class="px-3 py-2">
                                                                {{ variant.title || '—' }}
                                                            </td>
                                                            <td class="px-3 py-2 tabular-nums">
                                                                {{ variant.price }}
                                                            </td>
                                                        </tr>
                                                    }
                                                </tbody>
                                            </table>
                                        </div>
                                    } @else {
                                        <p class="text-sm text-muted-foreground">
                                            No variants yet. Add the first variant below.
                                        </p>
                                    }

                                    @if (canManage()) {
                                        <div class="grid gap-3 sm:grid-cols-3">
                                            <app-input
                                                id="variantSku"
                                                label="Variant SKU"
                                                placeholder="TEE-M"
                                                [modelValue]="newVariantSku()"
                                                (valueChange)="newVariantSku.set($event)"
                                            />
                                            <app-input
                                                id="variantPrice"
                                                label="Variant price"
                                                type="number"
                                                placeholder="29.99"
                                                [modelValue]="newVariantPrice()"
                                                (valueChange)="newVariantPrice.set($event)"
                                            />
                                            <app-input
                                                id="variantTitle"
                                                label="Variant title"
                                                placeholder="Size M"
                                                [modelValue]="newVariantTitle()"
                                                (valueChange)="newVariantTitle.set($event)"
                                            />
                                        </div>
                                        <app-button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            [disabled]="addingVariant()"
                                            (clicked)="addVariant()"
                                        >
                                            Add variant
                                        </app-button>
                                    }
                                </div>
                            </section>
                        } @else {
                            <section class="home-panel shadow-sm p-5">
                                <p class="text-sm text-muted-foreground">
                                    Variable products need variants. Save the product first, then add
                                    variant SKUs and prices.
                                </p>
                            </section>
                        }

                        <section class="home-panel shadow-sm">
                            <div class="home-panel-header">
                                <div>
                                    <h2 class="home-panel-title">SEO</h2>
                                    <p class="home-panel-desc">Search and social metadata</p>
                                </div>
                            </div>
                            <div class="home-panel-pad space-y-4">
                                <app-input
                                    id="metaTitle"
                                    label="Meta title"
                                    placeholder="Optional SEO title"
                                    [formField]="productForm.metaTitle"
                                    [error]="fieldError('metaTitle')"
                                    (valueChange)="onFieldInput('metaTitle')"
                                />
                                <app-textarea
                                    id="metaDescription"
                                    label="Meta description"
                                    placeholder="Optional SEO description"
                                    [rows]="3"
                                    [formField]="productForm.metaDescription"
                                />
                            </div>
                        </section>
                    </div>

                    <aside class="min-w-0 space-y-5">
                        <section class="home-panel shadow-sm">
                            <div class="home-panel-header">
                                <div>
                                    <h2 class="home-panel-title">Brand & categories</h2>
                                    <p class="home-panel-desc">Brand and category assignment</p>
                                </div>
                            </div>
                            <div class="home-panel-pad space-y-4">
                                <app-select
                                    id="brandId"
                                    label="Brand"
                                    placeholder="Select brand"
                                    [options]="brandOptions()"
                                    [formField]="productForm.brandId"
                                />
                                <div>
                                    <p class="form-label">Categories</p>
                                    @if (fieldError('categoryIds')) {
                                        <p class="form-error mb-2">{{ fieldError('categoryIds') }}</p>
                                    }
                                    <app-category-tree-picker
                                        [nodes]="categoryTree()"
                                        [selectedIds]="model().categoryIds"
                                        [disabled]="!canManage()"
                                        (selectedIdsChange)="onCategoriesChange($event)"
                                    />
                                </div>
                            </div>
                        </section>

                        <section class="home-panel shadow-sm">
                            <div class="home-panel-header">
                                <div>
                                    <h2 class="home-panel-title">Product images</h2>
                                    <p class="home-panel-desc">
                                        First image is used as the primary thumbnail
                                    </p>
                                </div>
                            </div>
                            <div class="home-panel-pad">
                                @if (fieldError('images')) {
                                    <p class="form-error mb-3">{{ fieldError('images') }}</p>
                                }
                                <app-product-images-panel
                                    [productId]="isEdit() ? productId() : null"
                                    [images]="displayImages()"
                                    [mediaAssets]="mediaAssets()"
                                    [canManage]="canManage()"
                                    (imagesChange)="onDraftImagesChange($event)"
                                    (changed)="reloadProduct()"
                                    (mediaUploaded)="reloadMediaAssets()"
                                />
                            </div>
                        </section>
                    </aside>
                </div>
            </form>
        }
    `,
})
export class ProductFormBodyComponent {
    private readonly productApi = inject(ProductApiService);
    private readonly brandApi = inject(BrandApiService);
    private readonly categoryApi = inject(CategoryApiService);
    private readonly mediaApi = inject(MediaApiService);
    private readonly authService = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly toast = inject(ToastService);

    readonly productId = input<string | null>(null);
    readonly saved = output<void>();
    readonly duplicated = output<void>();

    readonly isEdit = computed(() => !!this.productId());
    readonly submitLabel = computed(() =>
        this.isEdit() ? 'Save changes' : 'Create product',
    );

    readonly saving = signal(false);
    readonly actionLoading = signal(false);
    readonly addingVariant = signal(false);
    readonly submitted = signal(false);
    readonly fieldErrors = signal<Record<string, string[]>>({});
    readonly slugManuallyEdited = signal(false);
    readonly loadedProduct = signal<Product | null>(null);

    readonly newVariantSku = signal('');
    readonly newVariantPrice = signal('');
    readonly newVariantTitle = signal('');

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageProducts),
    );

    readonly draftImages = signal<ProductImageDraft[]>([]);

    readonly model = signal(defaultProductFormValues());

    readonly productForm = form(
        this.model,
        schema((f) => {
            required(f.name, { message: 'Name is required' });
            required(f.slug, { message: 'Slug is required' });
        }),
    );

    readonly typeProfile = computed(() => getProductTypeProfile(this.model().type));

    readonly typeOptions: SelectOption[] = productTypeOptions().map((option) => ({
        value: option.value,
        label: option.label,
    }));

    readonly displayImages = computed(() =>
        this.isEdit() ? (this.loadedProduct()?.images ?? []) : this.draftImages(),
    );

    readonly imageCount = computed(() => this.displayImages().length);

    readonly statusOptions: SelectOption[] = [
        { value: 'DRAFT', label: 'Draft' },
        { value: 'PUBLISHED', label: 'Published' },
        { value: 'ARCHIVED', label: 'Archived' },
    ];

    readonly visibilityOptions: SelectOption[] = [
        { value: 'VISIBLE', label: 'Visible' },
        { value: 'HIDDEN', label: 'Hidden' },
        { value: 'CATALOG_ONLY', label: 'Catalog only' },
        { value: 'SEARCH_ONLY', label: 'Search only' },
    ];

    readonly productResource = rxResource({
        params: () => {
            if (!this.authService.isAuthenticated() || !this.isEdit()) return undefined;
            return { id: this.productId()! };
        },
        stream: ({ params, abortSignal }) => {
            if (!params) return of(null as Product | null);
            throwIfAborted(abortSignal);
            return this.productApi.getById(params.id).pipe(
                catchResourceStreamError<Product | null>({
                    fallback: null,
                    logMessage: 'Failed to load product:',
                }),
            );
        },
    });

    readonly lookupsResource = rxResource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) {
                return of({
                    brands: [] as SelectOption[],
                    categoryTree: [] as CategoryTreeNode[],
                    media: [] as { id: string; url: string; altText: string | null; fileName: string }[],
                });
            }

            return forkJoin({
                brands: this.brandApi.list({ page: 1, pageSize: 100, status: 'PUBLISHED' }).pipe(
                    map((res) =>
                        res.data.map((brand) => ({ value: brand.id, label: brand.name })),
                    ),
                    catchResourceStreamError<SelectOption[]>({ fallback: [] }),
                ),
                categoryTree: this.categoryApi.tree().pipe(
                    catchResourceStreamError<CategoryTreeNode[]>({ fallback: [] }),
                ),
                media: this.mediaApi.list({ page: 1, pageSize: 24 }).pipe(
                    map((res) =>
                        res.data.map((asset) => ({
                            id: asset.id,
                            url: asset.url,
                            altText: asset.altText,
                            fileName: asset.fileName,
                        })),
                    ),
                    catchResourceStreamError<
                        { id: string; url: string; altText: string | null; fileName: string }[]
                    >({ fallback: [] }),
                ),
            });
        },
    });

    readonly brandOptions = computed((): SelectOption[] => {
        const brands = this.lookupsResource.value()?.brands ?? [];
        return [{ value: '', label: 'No brand' }, ...brands];
    });

    readonly categoryTree = computed(() => this.lookupsResource.value()?.categoryTree ?? []);
    readonly mediaAssets = computed(() => this.lookupsResource.value()?.media ?? []);
    readonly isLoadingProduct = computed(() => this.productResource.isLoading());

    private readonly applyLoadedProduct = effect(() => {
        const product = this.productResource.value();
        if (!product) return;

        this.loadedProduct.set(product);
        const defaultVariant = product.variants[0];

        this.model.set({
            name: product.name,
            slug: product.slug,
            description: product.description ?? '',
            shortDescription: product.shortDescription ?? '',
            type: product.type,
            status: product.status,
            visibility: product.visibility,
            featured: product.featured,
            brandId: product.brandId ?? '',
            categoryIds: product.categories.map((category) => category.id),
            price: product.price != null ? String(product.price) : '',
            compareAtPrice:
                defaultVariant?.compareAtPrice != null
                    ? String(defaultVariant.compareAtPrice)
                    : '',
            sku: product.sku ?? defaultVariant?.sku ?? '',
            trackInventory: defaultVariant?.trackInventory ?? true,
            initialStock: '0',
            metaTitle: product.metaTitle ?? '',
            metaDescription: product.metaDescription ?? '',
        });
        this.draftImages.set(
            product.images.map((image, position) => ({
                id: image.id,
                url: image.url,
                altText: image.altText,
                mediaId: image.mediaId ?? null,
                position,
            })),
        );
        this.slugManuallyEdited.set(true);
    });

    fieldError(name: ProductFormField): string | null {
        const show = shouldShowFieldError({ touched: false, submitted: this.submitted() });
        const customError = this.fieldErrors()[name]?.[0];
        let formField: string | null | undefined = null;
        if (name === 'name') {
            formField = this.productForm.name().errors()?.[0]?.message;
        } else if (name === 'slug') {
            formField = this.productForm.slug().errors()?.[0]?.message;
        }
        return resolveFieldError(customError ?? formField ?? null, show);
    }

    onFieldInput(field: string): void {
        this.fieldErrors.update((errors) => clearFieldFromErrors(errors, field));
    }

    onNameChange(value: string): void {
        this.onFieldInput('name');
        if (!this.slugManuallyEdited()) {
            this.model.update((current) => ({ ...current, slug: deriveSlugFromName(value) }));
        }
    }

    onTypeChange(type: string): void {
        const profile = getProductTypeProfile(type);
        this.model.update((current) => ({
            ...current,
            type,
            trackInventory: profile.defaultTrackInventory,
        }));
    }

    onCategoriesChange(categoryIds: string[]): void {
        this.model.update((current) => ({ ...current, categoryIds }));
        this.onFieldInput('categoryIds');
    }

    onDraftImagesChange(images: ProductImageDraft[]): void {
        this.draftImages.set(images);
        this.onFieldInput('images');
    }

    reloadProduct(): void {
        this.productResource.reload();
    }

    reloadMediaAssets(): void {
        this.lookupsResource.reload();
    }

    onSlugEdited(): void {
        this.slugManuallyEdited.set(true);
        this.onFieldInput('slug');
    }

    statusVariant(status: string) {
        switch (status) {
            case 'PUBLISHED':
                return 'success' as const;
            case 'ARCHIVED':
                return 'secondary' as const;
            default:
                return 'outline' as const;
        }
    }

    save(): void {
        const event = new Event('submit', { cancelable: true });
        this.onSubmit(event);
    }

    onSubmit(event: Event): void {
        event.preventDefault();
        if (!this.canManage()) return;

        this.submitted.set(true);
        const values = this.model();
        const profile = this.typeProfile();
        const errors = validateProductForm(values, {
            isEdit: this.isEdit(),
            imageCount: this.imageCount(),
        });

        if (Object.keys(errors).length) {
            this.fieldErrors.set(errors);
            return;
        }

        this.fieldErrors.set({});
        this.saving.set(true);

        const draftImages = this.draftImages().map((image, index) => ({
            url: image.url,
            altText: image.altText,
            mediaId: image.mediaId,
            position: index,
        }));

        const payload = {
            name: values.name.trim(),
            slug: values.slug.trim(),
            description: values.description.trim() || null,
            shortDescription: values.shortDescription.trim() || null,
            type: values.type as ProductType,
            status: values.status as Product['status'],
            visibility: values.visibility as Product['visibility'],
            featured: values.featured,
            brandId: values.brandId || null,
            categoryIds: values.categoryIds,
            metaTitle: values.metaTitle.trim() || null,
            metaDescription: values.metaDescription.trim() || null,
            trackInventory: values.trackInventory,
            ...(!this.isEdit() && draftImages.length ? { images: draftImages } : {}),
            ...(profile.showPricing
                ? {
                      price: parseOptionalNumber(values.price) ?? 0,
                      compareAtPrice: parseOptionalNumber(values.compareAtPrice) ?? null,
                      sku: values.sku.trim(),
                      initialStock: this.isEdit()
                          ? undefined
                          : parseOptionalNumber(values.initialStock) ?? 0,
                  }
                : {}),
        };

        const request$ = this.isEdit()
            ? this.productApi.update(this.productId()!, payload)
            : this.productApi.create(payload);

        request$.subscribe({
            next: (product) => {
                this.saving.set(false);
                this.toast.success(this.isEdit() ? 'Product updated' : 'Product created');
                if (product) {
                    this.loadedProduct.set(product);
                    if (this.isEdit()) {
                        this.productResource.reload();
                    }
                }
                this.saved.emit();
            },
            error: (error: unknown) => {
                this.saving.set(false);
                const mapped = mapApiValidationErrors(error);
                if (Object.keys(mapped).length) {
                    this.fieldErrors.set(mapped);
                }
                this.toast.error(apiErrorMessage(error, 'Failed to save product.'));
            },
        });
    }

    publishProduct(): void {
        this.runAction(() => this.productApi.publish(this.productId()!), 'Product published');
    }

    archiveProduct(): void {
        this.runAction(() => this.productApi.archive(this.productId()!), 'Product archived');
    }

    duplicateProduct(): void {
        this.actionLoading.set(true);
        this.productApi.duplicate(this.productId()!).subscribe({
            next: () => {
                this.actionLoading.set(false);
                this.toast.success('Product duplicated');
                this.duplicated.emit();
            },
            error: (error: unknown) => {
                this.actionLoading.set(false);
                this.toast.error(apiErrorMessage(error, 'Failed to duplicate product.'));
            },
        });
    }

    addVariant(): void {
        const sku = this.newVariantSku().trim();
        const price = parseOptionalNumber(this.newVariantPrice());
        if (!sku || price === undefined) {
            this.toast.error('Variant SKU and price are required.');
            return;
        }

        this.addingVariant.set(true);
        this.productApi
            .createVariant(this.productId()!, {
                sku,
                price,
                title: this.newVariantTitle().trim() || null,
                trackInventory: this.model().trackInventory,
            })
            .subscribe({
                next: () => {
                    this.addingVariant.set(false);
                    this.newVariantSku.set('');
                    this.newVariantPrice.set('');
                    this.newVariantTitle.set('');
                    this.toast.success('Variant added');
                    this.productResource.reload();
                },
                error: (error: unknown) => {
                    this.addingVariant.set(false);
                    this.toast.error(apiErrorMessage(error, 'Failed to add variant.'));
                },
            });
    }

    private runAction(action: () => ReturnType<ProductApiService['publish']>, successMessage: string): void {
        this.actionLoading.set(true);
        action().subscribe({
            next: () => {
                this.actionLoading.set(false);
                this.toast.success(successMessage);
                this.productResource.reload();
            },
            error: (error: unknown) => {
                this.actionLoading.set(false);
                this.toast.error(apiErrorMessage(error, 'Action failed.'));
            },
        });
    }
}

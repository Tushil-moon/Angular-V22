/**
 * Product images — gallery management with upload and media library integration.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import type { MediaAsset } from '@features/media/models/media.model';
import { MediaApiService } from '@features/media/services/media-api.service';
import { apiErrorMessage, resolveMediaUrl } from '@features/shared/admin-list.util';
import { ToastService } from '@services/toast.service';
import { ButtonComponent, IconComponent } from '@shared/components';
import { cn } from '@utils/cn';
import { catchError, concatMap, finalize, from, map, of, tap } from 'rxjs';

import type { ProductImage } from '../models/product.model';
import { ProductApiService } from '../services/product-api.service';

export interface ProductImageDraft {
    id?: string;
    url: string;
    altText: string | null;
    mediaId: string | null;
    position: number;
}

export interface MediaPickerAsset {
    id: string;
    url: string;
    altText: string | null;
    fileName: string;
}

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const DROP_ACTIVE =
    'border-primary/50 bg-primary/5 ring-2 ring-primary/15';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-product-images-panel',
    imports: [ButtonComponent, IconComponent],
    template: `
        <div
            class="space-y-4"
            [class.pointer-events-none]="busy()"
            [class.opacity-60]="busy()"
        >
            @if (gallery().length) {
                <div
                    class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
                >
                    <span class="font-medium text-foreground">
                        {{ gallery().length }}
                        {{ gallery().length === 1 ? 'image' : 'images' }}
                    </span>
                    <span>First image is the storefront thumbnail</span>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    @for (image of gallery(); track trackImage(image); let i = $index) {
                        <article class="group flex min-w-0 flex-col gap-2">
                            <div
                                [class]="
                                    cn(
                                        'relative aspect-square overflow-hidden rounded-lg border border-border/80 bg-muted/30',
                                        i === 0 &&
                                            'ring-2 ring-primary/40 ring-offset-2 ring-offset-background'
                                    )
                                "
                            >
                                @if (failedThumbs().has(i)) {
                                    <div
                                        class="flex size-full flex-col items-center justify-center gap-1.5 bg-muted/50 text-muted-foreground"
                                    >
                                        <app-icon name="image" [size]="22" />
                                        <span class="text-[10px]">Unavailable</span>
                                    </div>
                                } @else {
                                    <img
                                        [src]="imageUrl(image.url)"
                                        [alt]="image.altText || 'Product image'"
                                        class="size-full object-cover"
                                        loading="lazy"
                                        (error)="onThumbError(i)"
                                    />
                                }
                                @if (i === 0) {
                                    <span
                                        class="absolute left-2 top-2 z-[1] inline-flex items-center rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm"
                                    >
                                        Primary
                                    </span>
                                }
                                @if (canManage()) {
                                    <div
                                        class="absolute inset-x-0 bottom-0 z-[1] flex items-center justify-center gap-0.5 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-2 pb-2 pt-8 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                                    >
                                        <button
                                            type="button"
                                            class="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-0 bg-white/95 text-foreground shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                                            [disabled]="i === 0 || busy()"
                                            aria-label="Move image up"
                                            (click)="moveUp(i)"
                                        >
                                            <app-icon name="arrow-up" [size]="14" />
                                        </button>
                                        <button
                                            type="button"
                                            class="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-0 bg-white/95 text-foreground shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                                            [disabled]="i === gallery().length - 1 || busy()"
                                            aria-label="Move image down"
                                            (click)="moveDown(i)"
                                        >
                                            <app-icon name="arrow-down" [size]="14" />
                                        </button>
                                        <button
                                            type="button"
                                            class="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-0 bg-white/95 text-destructive shadow-sm transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                                            [disabled]="busy()"
                                            aria-label="Remove image"
                                            (click)="removeImage(i)"
                                        >
                                            <app-icon name="trash-2" [size]="14" />
                                        </button>
                                    </div>
                                }
                            </div>
                            <input
                                type="text"
                                class="input h-8 px-2.5 text-xs"
                                placeholder="Alt text (optional)"
                                [value]="image.altText ?? ''"
                                [attr.aria-label]="'Alt text for image ' + (i + 1)"
                                [disabled]="!canManage() || busy()"
                                (input)="updateAlt(i, $any($event.target).value)"
                            />
                        </article>
                    }
                </div>
            } @else {
                <div
                    [class]="
                        cn(
                            'flex min-h-[9rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-6 text-center',
                            dragActive() && DROP_ACTIVE
                        )
                    "
                    (dragover)="onDragOver($event)"
                    (dragleave)="onDragLeave($event)"
                    (drop)="onDrop($event)"
                >
                    <div
                        class="flex size-11 items-center justify-center rounded-full bg-muted/60 text-muted-foreground"
                    >
                        <app-icon name="image" [size]="22" />
                    </div>
                    <p class="text-sm font-medium text-foreground">No product images yet</p>
                    <p class="text-xs text-muted-foreground">
                        Upload or select at least one image before publishing
                    </p>
                </div>
            }

            @if (canManage()) {
                <div
                    [class]="
                        cn(
                            'rounded-xl border border-dashed border-border/80 bg-muted/10 p-4 transition-colors',
                            dragActive() && DROP_ACTIVE
                        )
                    "
                    (dragover)="onDragOver($event)"
                    (dragleave)="onDragLeave($event)"
                    (drop)="onDrop($event)"
                >
                    <input
                        #fileInput
                        type="file"
                        class="sr-only"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        [disabled]="busy()"
                        (change)="onFileSelected($event)"
                    />

                    <div class="flex flex-col items-center gap-3 text-center">
                        <div
                            class="flex size-11 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border/60"
                        >
                            <app-icon name="upload" [size]="20" />
                        </div>
                        <div>
                            <p class="text-sm font-medium text-foreground">
                                {{ busy() ? 'Uploading…' : 'Upload images' }}
                            </p>
                            <p class="max-w-xs text-xs leading-relaxed text-muted-foreground">
                                Drag & drop JPEG, PNG, WebP, or GIF — or browse files
                            </p>
                        </div>
                        <app-button
                            type="button"
                            size="toolbar"
                            variant="outline"
                            [disabled]="busy()"
                            (clicked)="fileInput.click()"
                        >
                            Browse files
                        </app-button>
                    </div>
                </div>

                <details class="product-images-advanced overflow-hidden rounded-xl border border-border/80 bg-muted/5">
                    <summary class="product-images-advanced-summary cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/30">
                        Add from URL or media library
                    </summary>
                    <div class="space-y-4 border-t border-border/60 px-4 py-4">
                        <div class="grid gap-2">
                            <label
                                class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                                for="newImageUrl"
                            >
                                Image URL
                            </label>
                            <div class="flex gap-2">
                                <input
                                    id="newImageUrl"
                                    type="url"
                                    class="input min-w-0 flex-1"
                                    placeholder="https://…"
                                    [value]="newImageUrl()"
                                    [disabled]="busy()"
                                    (input)="newImageUrl.set($any($event.target).value)"
                                    (keydown.enter)="addFromUrl(); $event.preventDefault()"
                                />
                                <app-button
                                    type="button"
                                    size="toolbar"
                                    variant="outline"
                                    [disabled]="busy() || !newImageUrl().trim()"
                                    (clicked)="addFromUrl()"
                                >
                                    Add
                                </app-button>
                            </div>
                        </div>

                        <div>
                            <p
                                class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                            >
                                Media library
                            </p>
                            <div
                                class="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto overscroll-y-contain pr-0.5"
                            >
                                @for (asset of mediaAssets(); track asset.id) {
                                    <button
                                        type="button"
                                        class="relative aspect-square overflow-hidden rounded-md border border-border/80 bg-muted/20 transition hover:border-primary/40 hover:ring-2 hover:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                                        [disabled]="busy()"
                                        [attr.aria-label]="'Add ' + asset.fileName"
                                        (click)="addFromMedia(asset)"
                                    >
                                        <img
                                            class="size-full object-cover"
                                            [src]="imageUrl(asset.url)"
                                            [alt]="asset.altText || asset.fileName"
                                            loading="lazy"
                                        />
                                    </button>
                                } @empty {
                                    <p
                                        class="col-span-full py-2 text-xs leading-relaxed text-muted-foreground"
                                    >
                                        Upload images above or add assets in Media, then pick them
                                        here.
                                    </p>
                                }
                            </div>
                        </div>
                    </div>
                </details>
            }
        </div>
    `,
})
export class ProductImagesPanelComponent {
    private readonly productApi = inject(ProductApiService);
    private readonly mediaApi = inject(MediaApiService);
    private readonly toast = inject(ToastService);

    /** Exposed for template `cn()` / drop-active class binding. */
    readonly cn = cn;
    readonly DROP_ACTIVE = DROP_ACTIVE;

    productId = input<string | null>(null);
    images = input<ProductImage[] | ProductImageDraft[]>([]);
    mediaAssets = input<MediaPickerAsset[]>([]);
    canManage = input(true);

    imagesChange = output<ProductImageDraft[]>();
    changed = output<void>();
    mediaUploaded = output<void>();

    readonly newImageUrl = signal('');
    readonly busy = signal(false);
    readonly dragActive = signal(false);
    readonly failedThumbs = signal<ReadonlySet<number>>(new Set());
    readonly gallery = computed(() => this.normalizeImages(this.images()));

    readonly imageUrl = (url: string): string => resolveMediaUrl(url);

    trackImage(image: ProductImage | ProductImageDraft): string {
        return image.id ?? `${image.url}-${image.position}`;
    }

    onThumbError(index: number): void {
        this.failedThumbs.update((current) => new Set(current).add(index));
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        this.dragActive.set(true);
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        this.dragActive.set(false);
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        this.dragActive.set(false);
        const files = event.dataTransfer?.files;
        if (files?.length) {
            this.uploadFiles(Array.from(files));
        }
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const files = input.files;
        if (files?.length) {
            this.uploadFiles(Array.from(files));
        }
        input.value = '';
    }

    updateAlt(index: number, altText: string): void {
        const next = [...this.gallery()];
        next[index] = { ...next[index], altText: altText.trim() || null };
        this.persistDraft(next);
        this.patchImageIfPersisted(next[index]);
    }

    addFromUrl(): void {
        const url = this.newImageUrl().trim();
        if (!url) {
            this.toast.error('Enter an image URL.');
            return;
        }
        const resolved = resolveMediaUrl(url);
        if (!/^https?:\/\/.+/i.test(resolved) && !resolved.includes('/uploads/')) {
            this.toast.error('Enter a valid image URL.');
            return;
        }
        this.addImage({ url: resolved, altText: null, mediaId: null });
        this.newImageUrl.set('');
    }

    addFromMedia(asset: MediaPickerAsset): void {
        this.addImage({
            url: asset.url,
            altText: asset.altText,
            mediaId: asset.id,
        });
    }

    removeImage(index: number): void {
        const current = this.gallery()[index];
        const productId = this.productId();
        if (productId && current.id) {
            this.busy.set(true);
            this.productApi.deleteImage(productId, current.id).subscribe({
                next: () => {
                    this.busy.set(false);
                    this.toast.success('Image removed');
                    this.changed.emit();
                },
                error: (error: unknown) => {
                    this.busy.set(false);
                    this.toast.error(apiErrorMessage(error, 'Failed to remove image.'));
                },
            });
            return;
        }

        const next = this.gallery()
            .filter((_, i) => i !== index)
            .map((image, position) => ({
                ...image,
                position,
            }));
        this.failedThumbs.set(new Set());
        this.persistDraft(next);
    }

    moveUp(index: number): void {
        if (index <= 0) return;
        this.reorder(index, index - 1);
    }

    moveDown(index: number): void {
        if (index >= this.gallery().length - 1) return;
        this.reorder(index, index + 1);
    }

    private uploadFiles(files: File[]): void {
        const images = files.filter((file) => ACCEPTED_IMAGE_TYPES.has(file.type));
        if (!images.length) {
            this.toast.error('Choose JPEG, PNG, WebP, or GIF images only.');
            return;
        }

        this.busy.set(true);
        let uploadedCount = 0;

        from(images)
            .pipe(
                concatMap((file) =>
                    this.mediaApi.upload(file).pipe(
                        concatMap((asset) => {
                            if (!asset) return of(null);
                            uploadedCount += 1;
                            return this.attachUploadedAsset(asset);
                        }),
                        catchError((error: unknown) => {
                            this.toast.error(
                                apiErrorMessage(error, `Failed to upload ${file.name}.`),
                            );
                            return of(null);
                        }),
                    ),
                ),
                finalize(() => this.busy.set(false)),
            )
            .subscribe({
                complete: () => {
                    if (uploadedCount > 0) {
                        this.toast.success(
                            uploadedCount === 1
                                ? 'Image uploaded'
                                : `${uploadedCount} images uploaded`,
                        );
                        this.mediaUploaded.emit();
                    }
                },
            });
    }

    private attachUploadedAsset(asset: MediaAsset) {
        const productId = this.productId();
        if (productId) {
            return this.productApi
                .addImage(productId, {
                    url: asset.url,
                    altText: asset.altText,
                    mediaId: asset.id,
                })
                .pipe(
                    tap(() => this.changed.emit()),
                    map(() => asset),
                );
        }

        const next = [
            ...this.gallery(),
            {
                url: asset.url,
                altText: asset.altText,
                mediaId: asset.id,
                position: this.gallery().length,
            },
        ];
        this.persistDraft(next);
        return of(asset);
    }

    private reorder(from: number, to: number): void {
        const next = [...this.gallery()];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        const normalized = next.map((image, position) => ({ ...image, position }));
        const productId = this.productId();

        if (productId && normalized.every((image) => image.id)) {
            this.busy.set(true);
            this.productApi
                .reorderImages(
                    productId,
                    normalized.map((image) => image.id!),
                )
                .subscribe({
                    next: () => {
                        this.busy.set(false);
                        this.changed.emit();
                    },
                    error: (error: unknown) => {
                        this.busy.set(false);
                        this.toast.error(apiErrorMessage(error, 'Failed to reorder images.'));
                    },
                });
            return;
        }

        this.failedThumbs.set(new Set());
        this.persistDraft(normalized);
    }

    private addImage(image: Omit<ProductImageDraft, 'position'>): void {
        const productId = this.productId();
        if (productId) {
            this.busy.set(true);
            this.productApi.addImage(productId, image).subscribe({
                next: () => {
                    this.busy.set(false);
                    this.toast.success('Image added');
                    this.changed.emit();
                },
                error: (error: unknown) => {
                    this.busy.set(false);
                    this.toast.error(apiErrorMessage(error, 'Failed to add image.'));
                },
            });
            return;
        }

        const next = [
            ...this.gallery(),
            {
                ...image,
                position: this.gallery().length,
            },
        ];
        this.persistDraft(next);
    }

    private patchImageIfPersisted(image: ProductImageDraft): void {
        const productId = this.productId();
        if (!productId || !image.id) return;

        this.productApi
            .updateImage(productId, image.id, {
                altText: image.altText,
            })
            .subscribe({
                error: (error: unknown) => {
                    this.toast.error(apiErrorMessage(error, 'Failed to update image.'));
                },
            });
    }

    private persistDraft(images: ProductImageDraft[]): void {
        this.imagesChange.emit(images);
    }

    private normalizeImages(images: ProductImage[] | ProductImageDraft[]): ProductImageDraft[] {
        return [...images]
            .sort((a, b) => a.position - b.position)
            .map((image, position) => ({
                id: image.id,
                url: image.url,
                altText: image.altText,
                mediaId: 'mediaId' in image ? (image.mediaId ?? null) : null,
                position,
            }));
    }
}

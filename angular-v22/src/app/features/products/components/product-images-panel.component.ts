/**
 * Product images — gallery management with upload and media library integration.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import type { MediaAsset } from '@features/media/models/media.model';
import { MediaApiService } from '@features/media/services/media-api.service';
import { apiErrorMessage } from '@features/shared/admin-list.util';
import { ToastService } from '@services/toast.service';
import { ButtonComponent, IconComponent, InputComponent } from '@shared/components';
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

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-product-images-panel',
    imports: [ButtonComponent, IconComponent, InputComponent],
    template: `
        <div class="product-images-panel space-y-4">
            @if (gallery().length) {
                <div class="product-images-grid">
                    @for (image of gallery(); track trackImage(image); let i = $index) {
                        <div class="product-image-card" [class.product-image-primary]="i === 0">
                            <img
                                [src]="image.url"
                                [alt]="image.altText || 'Product image'"
                                class="product-image-thumb"
                            />
                            <div class="product-image-meta">
                                @if (i === 0) {
                                    <span class="product-image-badge">Primary</span>
                                }
                                <app-input
                                    [id]="'image-alt-' + i"
                                    label="Alt text"
                                    placeholder="Describe this image"
                                    [modelValue]="image.altText ?? ''"
                                    (valueChange)="updateAlt(i, $event)"
                                />
                                @if (canManage()) {
                                    <div class="flex flex-wrap gap-1">
                                        <app-button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            [disabled]="i === 0 || busy()"
                                            (clicked)="moveUp(i)"
                                        >
                                            <app-icon name="arrow-up" [size]="14" />
                                        </app-button>
                                        <app-button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            [disabled]="i === gallery().length - 1 || busy()"
                                            (clicked)="moveDown(i)"
                                        >
                                            <app-icon name="arrow-down" [size]="14" />
                                        </app-button>
                                        <app-button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            [disabled]="busy()"
                                            (clicked)="removeImage(i)"
                                        >
                                            <app-icon name="trash-2" [size]="14" />
                                        </app-button>
                                    </div>
                                }
                            </div>
                        </div>
                    }
                </div>
            } @else {
                <div
                    class="product-images-empty flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground"
                    [class.product-images-drop-active]="dragActive()"
                >
                    <div class="text-center">
                        <app-icon name="image" [size]="28" />
                        <p class="mt-2 text-sm">Add at least one image for published products</p>
                    </div>
                </div>
            }

            @if (canManage()) {
                <div
                    class="product-images-dropzone rounded-xl border border-dashed border-border p-4 transition"
                    [class.product-images-drop-active]="dragActive()"
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

                    <div class="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
                        <div
                            class="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                        >
                            <app-icon name="upload" [size]="22" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="text-sm font-medium text-foreground">Upload images</p>
                            <p class="text-sm text-muted-foreground">
                                Drag and drop JPEG, PNG, WebP, or GIF files here, or browse from your device.
                            </p>
                        </div>
                        <app-button
                            type="button"
                            size="sm"
                            variant="outline"
                            [disabled]="busy()"
                            (clicked)="fileInput.click()"
                        >
                            {{ busy() ? 'Uploading…' : 'Browse files' }}
                        </app-button>
                    </div>
                </div>

                <div class="space-y-3 rounded-xl border border-border p-3">
                    <p class="text-sm font-medium text-foreground">Add image URL</p>
                    <div class="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <app-input
                            id="newImageUrl"
                            label="Image URL"
                            placeholder="https://..."
                            [modelValue]="newImageUrl()"
                            (valueChange)="newImageUrl.set($event)"
                        />
                        <div class="flex items-end">
                            <app-button
                                type="button"
                                size="sm"
                                variant="outline"
                                [disabled]="busy() || !newImageUrl().trim()"
                                (clicked)="addFromUrl()"
                            >
                                Add URL
                            </app-button>
                        </div>
                    </div>

                    <div>
                        <p class="mb-2 text-sm font-medium text-foreground">Media library</p>
                        <div class="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto">
                            @for (asset of mediaAssets(); track asset.id) {
                                <button
                                    type="button"
                                    class="overflow-hidden rounded-lg border border-border transition hover:ring-2 hover:ring-primary"
                                    [disabled]="busy()"
                                    (click)="addFromMedia(asset)"
                                >
                                    <img
                                        [src]="asset.url"
                                        [alt]="asset.altText || asset.fileName"
                                        class="aspect-square w-full object-cover"
                                    />
                                </button>
                            } @empty {
                                <p class="col-span-4 text-sm text-muted-foreground">
                                    Upload images above or add assets in Media, then pick them here.
                                </p>
                            }
                        </div>
                    </div>
                </div>
            }
        </div>
    `,
    styles: `
        .product-images-grid {
            @apply grid gap-3;
        }

        .product-image-card {
            @apply grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[7rem_1fr];
        }

        .product-image-primary {
            @apply border-primary/40 bg-primary/5;
        }

        .product-image-thumb {
            @apply size-28 rounded-lg border border-border object-cover;
        }

        .product-image-meta {
            @apply space-y-2;
        }

        .product-image-badge {
            @apply inline-flex rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground;
        }

        .product-images-dropzone,
        .product-images-empty {
            @apply bg-muted/10;
        }

        .product-images-drop-active {
            @apply border-primary bg-primary/5 ring-2 ring-primary/20;
        }
    `,
})
export class ProductImagesPanelComponent {
    private readonly productApi = inject(ProductApiService);
    private readonly mediaApi = inject(MediaApiService);
    private readonly toast = inject(ToastService);

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
    readonly gallery = computed(() => this.normalizeImages(this.images()));

    trackImage(image: ProductImage | ProductImageDraft): string {
        return image.id ?? `${image.url}-${image.position}`;
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
        if (!url || !/^https?:\/\/.+/i.test(url)) {
            this.toast.error('Enter a valid image URL starting with http:// or https://');
            return;
        }
        this.addImage({ url, altText: null, mediaId: null });
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

        const next = this.gallery().filter((_, i) => i !== index).map((image, position) => ({
            ...image,
            position,
        }));
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
                            uploadedCount === 1 ? 'Image uploaded' : `${uploadedCount} images uploaded`,
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

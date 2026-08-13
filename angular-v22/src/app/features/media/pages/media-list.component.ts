/**
 * Media library — upload, browse, and manage catalog assets.
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
    apiErrorMessage,
    formatBytes,
    formatDateTime,
    listTotalCount,
    resolveMediaUrl,
} from '@features/shared/admin-list.util';
import type { FilterOptions } from '@models/index';
import { AuthService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    EnterpriseDetailSheetComponent,
    IconComponent,
    PaginationComponent,
    SearchInputComponent,
    ViewSwitcherComponent,
} from '@shared/components';
import { LIST_CARDS_VIEW_OPTIONS } from '@shared/components/view-switcher.component';
import { Permissions } from '@shared/constants/permissions';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import { cn } from '@utils/cn';
import { catchError, concatMap, finalize, from, map, of } from 'rxjs';

import type { MediaAsset } from '../models/media.model';
import { MediaApiService } from '../services/media-api.service';

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const DROP_ACTIVE = 'border-primary/50 bg-primary/5 ring-2 ring-primary/15';

interface PageResult {
    items: MediaAsset[];
    total: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-media-list',
    imports: [
        SearchInputComponent,
        ButtonComponent,
        IconComponent,
        PaginationComponent,
        ViewSwitcherComponent,
        EnterpriseDetailSheetComponent,
    ],
    template: `
        <div class="index-page page-shell-fill om-page">
            <div class="index-header">
                <div class="index-header-copy">
                    <h1 class="index-title">Media</h1>
                    <p class="index-subtitle">
                        Upload and manage images used across products and content
                    </p>
                </div>
                @if (canManage()) {
                    <div class="index-actions">
                        <app-button size="toolbar" variant="primary" [disabled]="uploading()" (clicked)="pickFiles()">
                            <app-icon name="upload" [size]="14" />
                            Upload images
                        </app-button>
                    </div>
                }
            </div>

            <div class="product-kpi-row shrink-0">
                <article class="index-metric">
                    <div class="index-metric-top">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <div class="index-metric-icon">
                                    <app-icon name="image" [size]="18" />
                                </div>
                                <p class="index-metric-label">Total media</p>
                            </div>
                            <p class="index-metric-value">{{ summaryTotal() }}</p>
                            <p class="om-kpi-meta">All uploaded assets</p>
                        </div>
                    </div>
                </article>
            </div>

            @if (loadError()) {
                <p class="px-4 text-sm text-destructive">{{ loadError() }}</p>
            }

            <section class="index-card">
                <div class="om-list-header">
                    <div>
                        <h2 class="om-list-title">Media library</h2>
                        <p class="index-subtitle">{{ total() }} matching this view</p>
                    </div>
                    <div class="index-actions">
                        <app-view-switcher
                            ariaLabel="Media view mode"
                            [options]="viewOptions"
                            [value]="viewMode()"
                            (valueChange)="viewMode.set($event)"
                        />
                    </div>
                </div>

                <div class="index-filters">
                    <div class="index-filters-leading">
                        <app-search-input
                            placeholder="Search by filename or alt text..."
                            [initialValue]="searchQuery()"
                            (searchChange)="onSearch($event)"
                        />
                        <span class="index-count">{{ total() }} assets</span>
                    </div>
                </div>

                @if (canManage()) {
                    <div
                        [class]="
                            cn(
                                'mx-4 mb-4 rounded-xl border border-dashed border-border/80 bg-muted/10 p-4 transition-colors',
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
                            [disabled]="uploading()"
                            (change)="onFileSelected($event)"
                        />
                        <div class="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
                            <div class="flex items-center gap-3">
                                <div
                                    class="flex size-10 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border/60"
                                >
                                    <app-icon name="upload" [size]="18" />
                                </div>
                                <div>
                                    <p class="text-sm font-medium text-foreground">
                                        {{ uploading() ? 'Uploading…' : 'Drop images here' }}
                                    </p>
                                    <p class="text-xs text-muted-foreground">
                                        JPEG, PNG, WebP, or GIF — up to 5 MB each
                                    </p>
                                </div>
                            </div>
                            <app-button
                                type="button"
                                size="toolbar"
                                variant="outline"
                                [disabled]="uploading()"
                                (clicked)="fileInput.click()"
                            >
                                Browse files
                            </app-button>
                        </div>
                    </div>
                }

                <div class="index-body">
                    @if (isLoading()) {
                        <div class="grid gap-3 p-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                            @for (_ of skeletonItems; track $index) {
                                <div class="aspect-[4/3] animate-pulse rounded-lg border border-border bg-muted"></div>
                            }
                        </div>
                    } @else if (items().length === 0) {
                        <div class="index-empty">
                            <p class="index-empty-title">No media assets yet</p>
                            <p class="index-empty-desc">
                                Upload images to use them in products and content.
                            </p>
                        </div>
                    } @else if (viewMode() === 'cards') {
                        <div class="grid gap-3 p-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                            @for (item of items(); track item.id) {
                                <article
                                    class="group overflow-hidden rounded-lg border border-border/80 bg-card transition-colors hover:border-primary/30 hover:shadow-sm"
                                >
                                    <button
                                        type="button"
                                        class="relative block aspect-square w-full overflow-hidden bg-muted/30"
                                        (click)="openDetail(item)"
                                    >
                                        @if (failedIds().has(item.id)) {
                                            <div
                                                class="flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground"
                                            >
                                                <app-icon name="image" [size]="24" />
                                                <span class="text-[10px]">Unavailable</span>
                                            </div>
                                        } @else {
                                            <img
                                                [src]="mediaUrl(item.url)"
                                                [alt]="item.altText || item.fileName"
                                                class="size-full object-cover transition-transform group-hover:scale-[1.02]"
                                                loading="lazy"
                                                (error)="onImageError(item.id)"
                                            />
                                        }
                                    </button>
                                    <div class="space-y-2 p-3">
                                        <button
                                            type="button"
                                            class="block w-full truncate text-left text-sm font-medium text-foreground hover:text-primary"
                                            (click)="openDetail(item)"
                                        >
                                            {{ item.fileName }}
                                        </button>
                                        <p class="truncate text-xs text-muted-foreground">
                                            {{ item.mimeType }} · {{ formatBytes(item.sizeBytes) }}
                                        </p>
                                        @if (canManage()) {
                                            <div class="flex items-center gap-1 pt-1">
                                                <app-button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    [disabled]="deletingId() === item.id"
                                                    (clicked)="deleteAsset(item, $event)"
                                                >
                                                    <span class="sr-only">Delete</span>
                                                    <app-icon name="trash-2" [size]="14" />
                                                </app-button>
                                            </div>
                                        }
                                    </div>
                                </article>
                            }
                        </div>
                    } @else {
                        <div class="overflow-x-auto">
                            <table class="w-full min-w-[640px] text-sm">
                                <thead>
                                    <tr class="border-b border-border/80 bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                        <th class="px-4 py-3 font-medium">Preview</th>
                                        <th class="px-4 py-3 font-medium">Filename</th>
                                        <th class="px-4 py-3 font-medium">Type</th>
                                        <th class="px-4 py-3 font-medium">Size</th>
                                        <th class="px-4 py-3 font-medium">Uploaded</th>
                                        @if (canManage()) {
                                            <th class="px-4 py-3 font-medium">Actions</th>
                                        }
                                    </tr>
                                </thead>
                                <tbody>
                                    @for (item of items(); track item.id) {
                                        <tr
                                            class="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/20"
                                            (click)="openDetail(item)"
                                        >
                                            <td class="px-4 py-3">
                                                <div class="size-12 overflow-hidden rounded-md border border-border/80 bg-muted/30">
                                                    @if (failedIds().has(item.id)) {
                                                        <div class="flex size-full items-center justify-center text-muted-foreground">
                                                            <app-icon name="image" [size]="16" />
                                                        </div>
                                                    } @else {
                                                        <img
                                                            [src]="mediaUrl(item.url)"
                                                            [alt]="item.altText || item.fileName"
                                                            class="size-full object-cover"
                                                            loading="lazy"
                                                            (error)="onImageError(item.id)"
                                                        />
                                                    }
                                                </div>
                                            </td>
                                            <td class="max-w-[12rem] truncate px-4 py-3 font-medium">{{ item.fileName }}</td>
                                            <td class="px-4 py-3 text-muted-foreground">{{ item.mimeType }}</td>
                                            <td class="px-4 py-3 text-muted-foreground">{{ formatBytes(item.sizeBytes) }}</td>
                                            <td class="px-4 py-3 text-muted-foreground">{{ formatDateTime(item.createdAt) }}</td>
                                            @if (canManage()) {
                                                <td class="px-4 py-3">
                                                    <app-button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        [disabled]="deletingId() === item.id"
                                                        (clicked)="deleteAsset(item, $event)"
                                                    >
                                                        <span class="sr-only">Delete</span>
                                                        <app-icon name="trash-2" [size]="16" />
                                                    </app-button>
                                                </td>
                                            }
                                        </tr>
                                    }
                                </tbody>
                            </table>
                        </div>
                    }
                </div>

                <div class="index-footer">
                    <app-pagination
                        [page]="currentPage()"
                        [pageSize]="pageSize()"
                        [total]="total()"
                        (pageChange)="currentPage.set($event)"
                    />
                </div>
            </section>
        </div>

        <app-enterprise-detail-sheet
            [open]="detailOpen()"
            eyebrow="Media asset"
            [title]="selected()?.fileName ?? ''"
            [subtitle]="selectedSubtitle()"
            [fields]="detailFields()"
            [showActions]="canManage()"
            (closed)="closeDetail()"
        >
            @if (selected(); as item) {
                <div class="mt-4 overflow-hidden rounded-lg border border-border/80 bg-muted/20">
                    @if (failedIds().has(item.id)) {
                        <div class="flex aspect-video items-center justify-center text-muted-foreground">
                            <app-icon name="image" [size]="32" />
                        </div>
                    } @else {
                        <img
                            [src]="mediaUrl(item.url)"
                            [alt]="item.altText || item.fileName"
                            class="max-h-64 w-full object-contain"
                            (error)="onImageError(item.id)"
                        />
                    }
                </div>

                @if (canManage()) {
                    <div class="mt-4 space-y-2">
                        <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground" for="mediaAltText">
                            Alt text
                        </label>
                        <input
                            id="mediaAltText"
                            type="text"
                            class="input"
                            [value]="editAltText()"
                            (input)="editAltText.set($any($event.target).value)"
                        />
                    </div>
                }
            }

            <div detailActions class="flex w-full items-center justify-between gap-2">
                @if (selected(); as item) {
                    <app-button type="button" size="toolbar" variant="outline" (clicked)="copyUrl(item.url)">
                        <app-icon name="link" [size]="14" />
                        Copy URL
                    </app-button>
                    @if (canManage()) {
                        <div class="flex gap-2">
                            <app-button
                                type="button"
                                size="toolbar"
                                variant="outline"
                                [disabled]="savingAlt()"
                                (clicked)="saveAltText()"
                            >
                                Save alt text
                            </app-button>
                            <app-button
                                type="button"
                                size="toolbar"
                                variant="destructive"
                                [disabled]="deletingId() === item.id"
                                (clicked)="deleteSelected()"
                            >
                                Delete
                            </app-button>
                        </div>
                    }
                }
            </div>
        </app-enterprise-detail-sheet>
    `,
})
export class MediaListComponent {
    private readonly mediaApi = inject(MediaApiService);
    private readonly auth = inject(AuthService);
    private readonly permissions = inject(PermissionService);
    private readonly toast = inject(ToastService);

    readonly cn = cn;
    readonly DROP_ACTIVE = DROP_ACTIVE;
    readonly formatBytes = formatBytes;
    readonly formatDateTime = formatDateTime;
    readonly viewOptions = LIST_CARDS_VIEW_OPTIONS;
    readonly skeletonItems = Array.from({ length: 8 });

    readonly searchQuery = signal('');
    readonly currentPage = signal(1);
    readonly pageSize = signal(24);
    readonly viewMode = signal<'list' | 'cards'>('cards');
    readonly uploading = signal(false);
    readonly dragActive = signal(false);
    readonly deletingId = signal<string | null>(null);
    readonly savingAlt = signal(false);
    readonly failedIds = signal<ReadonlySet<string>>(new Set());
    readonly detailOpen = signal(false);
    readonly selected = signal<MediaAsset | null>(null);
    readonly editAltText = signal('');

    readonly canManage = computed(
        () =>
            this.auth.isAuthenticated() &&
            this.permissions.hasPermission(Permissions.ManageMedia),
    );

    readonly listResource = rxResource({
        params: () =>
            this.auth.isAuthenticated()
                ? {
                      page: this.currentPage(),
                      pageSize: this.pageSize(),
                      search: this.searchQuery().trim() || undefined,
                  }
                : undefined,
        stream: ({ params, abortSignal }) => {
            if (!params) return of<PageResult>({ items: [], total: 0 });
            throwIfAborted(abortSignal);
            return this.mediaApi.list(params as FilterOptions).pipe(
                map((response) => ({
                    items: response.data,
                    total: response.total,
                })),
                catchResourceStreamError<PageResult>({ fallback: { items: [], total: 0 } }),
            );
        },
    });

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0 });
            return listTotalCount((filters) => this.mediaApi.list(filters)).pipe(
                map((total) => ({ total })),
            );
        },
    });

    readonly items = computed(() => this.listResource.value()?.items ?? []);
    readonly total = computed(() => this.listResource.value()?.total ?? 0);
    readonly summaryTotal = computed(() => this.summaryResource.value()?.total ?? 0);
    readonly isLoading = computed(() => this.listResource.isLoading());
    readonly loadError = computed(() => {
        const error = this.listResource.error();
        return error ? apiErrorMessage(error, 'Failed to load media.') : null;
    });

    readonly selectedSubtitle = computed(() => {
        const item = this.selected();
        if (!item) return '';
        return `${item.mimeType} · ${formatBytes(item.sizeBytes)}`;
    });

    readonly detailFields = computed(() => {
        const item = this.selected();
        if (!item) return [];
        return [
            { label: 'Original name', value: item.originalName ?? '—' },
            {
                label: 'Dimensions',
                value: item.width && item.height ? `${item.width} × ${item.height}` : '—',
            },
            { label: 'URL', value: item.url },
            { label: 'Storage key', value: item.storageKey },
            { label: 'Uploaded', value: formatDateTime(item.createdAt) },
        ];
    });

    readonly mediaUrl = (url: string): string => resolveMediaUrl(url);

    onSearch(query: string): void {
        this.searchQuery.set(query);
        this.currentPage.set(1);
    }

    pickFiles(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp,image/gif';
        input.multiple = true;
        input.onchange = () => {
            const files = input.files ? Array.from(input.files) : [];
            if (files.length) this.uploadFiles(files);
        };
        input.click();
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

    onImageError(id: string): void {
        this.failedIds.update((current) => new Set(current).add(id));
    }

    openDetail(item: MediaAsset): void {
        this.selected.set(item);
        this.editAltText.set(item.altText ?? '');
        this.detailOpen.set(true);
    }

    closeDetail(): void {
        this.detailOpen.set(false);
        this.selected.set(null);
    }

    copyUrl(url: string): void {
        void navigator.clipboard.writeText(resolveMediaUrl(url)).then(
            () => this.toast.success('URL copied to clipboard'),
            () => this.toast.error('Could not copy URL'),
        );
    }

    saveAltText(): void {
        const item = this.selected();
        if (!item) return;

        this.savingAlt.set(true);
        this.mediaApi
            .update(item.id, { altText: this.editAltText().trim() || null })
            .subscribe({
                next: (updated) => {
                    this.savingAlt.set(false);
                    if (updated) {
                        this.selected.set(updated);
                        this.toast.success('Alt text saved');
                        this.listResource.reload();
                    }
                },
                error: (error: unknown) => {
                    this.savingAlt.set(false);
                    this.toast.error(apiErrorMessage(error, 'Failed to save alt text.'));
                },
            });
    }

    deleteAsset(item: MediaAsset, event: Event): void {
        event.stopPropagation();
        if (!confirm(`Delete "${item.fileName}"? This cannot be undone.`)) return;

        this.deletingId.set(item.id);
        this.mediaApi.delete(item.id).subscribe({
            next: () => {
                this.deletingId.set(null);
                this.toast.success('Media deleted');
                if (this.selected()?.id === item.id) {
                    this.closeDetail();
                }
                this.listResource.reload();
                this.summaryResource.reload();
            },
            error: (error: unknown) => {
                this.deletingId.set(null);
                this.toast.error(apiErrorMessage(error, 'Failed to delete media.'));
            },
        });
    }

    deleteSelected(): void {
        const item = this.selected();
        if (!item) return;
        this.deleteAsset(item, new Event('click'));
    }

    private uploadFiles(files: File[]): void {
        const images = files.filter((file) => ACCEPTED_IMAGE_TYPES.has(file.type));
        if (!images.length) {
            this.toast.error('Choose JPEG, PNG, WebP, or GIF images only.');
            return;
        }

        this.uploading.set(true);
        let uploadedCount = 0;

        from(images)
            .pipe(
                concatMap((file) =>
                    this.mediaApi.upload(file).pipe(
                        map((asset) => {
                            if (asset) uploadedCount += 1;
                            return asset;
                        }),
                        catchError((error: unknown) => {
                            this.toast.error(
                                apiErrorMessage(error, `Failed to upload ${file.name}.`),
                            );
                            return of(null);
                        }),
                    ),
                ),
                finalize(() => {
                    this.uploading.set(false);
                    if (uploadedCount > 0) {
                        this.toast.success(
                            uploadedCount === 1
                                ? 'Image uploaded'
                                : `${uploadedCount} images uploaded`,
                        );
                        this.listResource.reload();
                        this.summaryResource.reload();
                        this.currentPage.set(1);
                    }
                }),
            )
            .subscribe();
    }
}

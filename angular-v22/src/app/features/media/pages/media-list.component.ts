/**
 * Media list — enterprise shell over /media
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
    formatBytes,
    formatDateTime,
    listTotalCount,
} from '@features/shared/admin-list.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { AuthService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import type { MediaAsset } from '../models/media.model';
import { MediaApiService } from '../services/media-api.service';

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function pickImageFile(): Promise<File | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp,image/gif';
        input.onchange = () => resolve(input.files?.[0] ?? null);
        input.click();
    });
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-media-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            listTitle="Media list"
            defaultView="cards"
            [enableCardView]="true"
            [config]="config"
            [listFn]="listMedia"
            [createFn]="createMedia"
            [deleteFn]="deleteMedia"
            [kpis]="kpiCards()"
        />
    `,
})
export class MediaListComponent {
    private readonly mediaApi = inject(MediaApiService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<MediaAsset> = {
        title: 'Media',
        description: 'Images and documents referenced across your catalog and content.',
        entityLabel: 'media asset',
        managePermission: Permissions.ManageMedia,
        columns: [
            { key: 'fileName', label: 'Filename', cell: (item) => item.fileName },
            { key: 'mimeType', label: 'Type', cell: (item) => item.mimeType, hideBelow: 'sm' },
            {
                key: 'sizeBytes',
                label: 'Size',
                cell: (item) => formatBytes(item.sizeBytes),
                hideBelow: 'md',
            },
            {
                key: 'createdAt',
                label: 'Uploaded',
                cell: (item) => formatDateTime(item.createdAt),
                hideBelow: 'lg',
            },
        ],
        cardTitle: (item) => item.fileName,
        cardSubtitle: (item) => `${item.mimeType} · ${formatBytes(item.sizeBytes)}`,
        detailFields: (item) => [
            { label: 'Filename', value: item.fileName },
            { label: 'Original name', value: item.originalName ?? '—' },
            { label: 'Type', value: item.mimeType },
            { label: 'Size', value: formatBytes(item.sizeBytes) },
            {
                label: 'Dimensions',
                value: item.width && item.height ? `${item.width} × ${item.height}` : '—',
            },
            { label: 'URL', value: item.url },
            { label: 'Storage key', value: item.storageKey },
            { label: 'Uploaded', value: formatDateTime(item.createdAt) },
        ],
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0 });
            return listTotalCount((f) => this.mediaApi.list(f)).pipe(map((total) => ({ total })));
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0 };
        return [
            { label: 'Total media', value: String(s.total), detail: 'All assets', icon: 'image' },
        ];
    });

    readonly listMedia = (filters: FilterOptions): Observable<PaginatedResponse<MediaAsset>> =>
        this.mediaApi.list(filters);

    readonly createMedia = (): Observable<MediaAsset | null> =>
        new Observable((observer) => {
            void pickImageFile().then((file) => {
                if (!file) {
                    observer.next(null);
                    observer.complete();
                    return;
                }
                if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
                    observer.error(new Error('Only JPEG, PNG, WebP, and GIF images are supported.'));
                    return;
                }
                this.mediaApi.upload(file).subscribe({
                    next: (asset) => {
                        observer.next(asset);
                        observer.complete();
                    },
                    error: (error: unknown) => observer.error(error),
                });
            });
        });

    readonly deleteMedia = (id: string): Observable<void> => this.mediaApi.delete(id);
}

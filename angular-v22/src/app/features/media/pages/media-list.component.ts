/**
 * Media list — enterprise shell over /media
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
    formatBytes,
    formatDateTime,
    listTotalCount,
    openNameSlugDialog,
    slugify,
} from '@features/shared/admin-list.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { DialogService } from '@services/dialog.service';
import { AuthService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { map, Observable, of, switchMap } from 'rxjs';

import type { MediaAsset } from '../models/media.model';
import { MediaApiService } from '../services/media-api.service';

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    pdf: 'application/pdf',
    png: 'image/png',
    svg: 'image/svg+xml',
    webp: 'image/webp',
};

const DEFAULT_MIME_TYPE = 'image/png';

function guessMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
    return MIME_TYPES_BY_EXTENSION[extension] ?? DEFAULT_MIME_TYPE;
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
    private readonly dialog = inject(DialogService);
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
        openNameSlugDialog(this.dialog, {
            title: 'Register media asset',
            submitLabel: 'Create asset',
            showSlug: false,
        }).pipe(
            switchMap((result) => {
                if (!result) return of(null);
                // Storage keys are unique per store, so placeholder entries get a timestamp suffix.
                const storageKey = `${slugify(result.name) || 'asset'}-${Date.now()}`;
                return this.mediaApi.create({
                    url: `https://placeholder.local/${storageKey}`,
                    storageKey,
                    mimeType: guessMimeType(result.name),
                    size: 0,
                    fileName: result.name,
                });
            }),
        );

    readonly deleteMedia = (id: string): Observable<void> => this.mediaApi.delete(id);
}

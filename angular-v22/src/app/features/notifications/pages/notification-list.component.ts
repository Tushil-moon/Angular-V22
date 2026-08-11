/**
 * Notifications — Resource Index shell
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { formatDateTime, orDash } from '@features/shared/admin-list.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { AuthService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
    IconComponent,
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { map, Observable, of } from 'rxjs';

import type { NotificationItem } from '../models/notification.model';
import { NotificationApiService } from '../services/notification-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-notification-list',
    imports: [EnterpriseListShellComponent, ButtonComponent, IconComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [kpis]="kpiCards()"
            listTitle="Notification list"
        >
            <app-button listActions size="sm" variant="outline" (clicked)="markAll()">
                <app-icon name="check" [size]="14" />
                Mark all read
            </app-button>
        </app-enterprise-list-shell>
    `,
})
export class NotificationListComponent {
    private readonly api = inject(NotificationApiService);
    private readonly toast = inject(ToastService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<NotificationItem> = {
        title: 'Notifications',
        description: 'Review system and customer notifications',
        entityLabel: 'notification',
        managePermission: Permissions.ManageNotifications,
        hideCreate: true,
        hideDelete: true,
        columns: [
            { key: 'title', label: 'Title', cell: (i) => i.title },
            { key: 'body', label: 'Body', cell: (i) => orDash(i.body), hideBelow: 'md' },
            {
                key: 'read',
                label: 'Read',
                cell: (i) => (i.readAt ? 'Read' : 'Unread'),
                badge: (i) => ({
                    text: i.readAt ? 'Read' : 'Unread',
                    variant: i.readAt ? 'secondary' : 'warning',
                }),
            },
            {
                key: 'created',
                label: 'When',
                cell: (i) => formatDateTime(i.createdAt),
                hideBelow: 'lg',
            },
        ],
        cardTitle: (i) => i.title,
        cardSubtitle: (i) => orDash(i.body),
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, unread: 0 });
            return this.api.list({ page: 1, pageSize: 100 }).pipe(
                map((result) => ({
                    total: result.total,
                    unread: result.data.filter((n) => !n.readAt).length,
                })),
            );
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0, unread: 0 };
        return [
            { label: 'Total', value: String(s.total), detail: 'All notifications', icon: 'bell' },
            {
                label: 'Unread',
                value: String(s.unread),
                detail: 'Among recent items',
                icon: 'alert-circle',
            },
        ];
    });

    readonly listFn = (f: FilterOptions): Observable<PaginatedResponse<NotificationItem>> =>
        this.api.list(f);
    readonly createFn = (): Observable<NotificationItem | null> => of(null);
    readonly deleteFn = (): Observable<void> => this.api.delete();

    markAll(): void {
        this.api.markAllRead().subscribe({
            next: () => {
                this.toast.success('All notifications marked read');
                this.summaryResource.reload();
            },
            error: () => this.toast.error('Could not mark notifications read'),
        });
    }
}

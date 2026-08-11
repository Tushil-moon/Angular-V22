import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import { map, Observable } from 'rxjs';

import { crudList, noopDelete } from '../../shared/crud-api.util';
import type { ApiNotificationPayload, NotificationItem } from '../models/notification.model';

export function mapApiNotification(p: ApiNotificationPayload): NotificationItem {
    return {
        id: p.id,
        title: p.title ?? 'Notification',
        body: p.body ?? null,
        readAt: p.read_at ?? null,
        createdAt: p.created_at ?? '',
    };
}

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
    private readonly http = inject(HttpClientService);

    list(filters: FilterOptions = {}): Observable<PaginatedResponse<NotificationItem>> {
        return crudList(this.http, '/notifications', mapApiNotification, filters);
    }

    markAllRead(): Observable<void> {
        return this.http.patch('/notifications/read-all', {}).pipe(map(() => undefined));
    }

    markRead(id: string): Observable<void> {
        return this.http.patch(`/notifications/${id}/read`, {}).pipe(map(() => undefined));
    }

    delete = noopDelete;
}

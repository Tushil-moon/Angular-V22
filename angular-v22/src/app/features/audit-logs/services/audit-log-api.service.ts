import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import type { Observable } from 'rxjs';

import { crudList, noopDelete } from '../../shared/crud-api.util';
import type { ApiAuditLogPayload, AuditLogEntry } from '../models/audit-log.model';

export function mapApiAuditLog(p: ApiAuditLogPayload): AuditLogEntry {
    return {
        id: p.id,
        action: p.action ?? 'UNKNOWN',
        actorEmail: p.user?.email ?? null,
        ipAddress: p.ip_address ?? null,
        createdAt: p.created_at ?? '',
    };
}

@Injectable({ providedIn: 'root' })
export class AuditLogApiService {
    private readonly http = inject(HttpClientService);

    list(filters: FilterOptions = {}): Observable<PaginatedResponse<AuditLogEntry>> {
        return crudList(this.http, '/audit-logs', mapApiAuditLog, filters);
    }

    delete = noopDelete;
}

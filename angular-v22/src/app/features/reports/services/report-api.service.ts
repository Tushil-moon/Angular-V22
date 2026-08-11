import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import type { Observable } from 'rxjs';

import { crudCreate, crudList, noopDelete } from '../../shared/crud-api.util';
import { readFilter } from '../../shared/list-params.util';
import type { ApiReportPayload, ReportJob } from '../models/report.model';

export function mapApiReport(p: ApiReportPayload): ReportJob {
    return {
        id: p.id,
        type: p.type ?? 'UNKNOWN',
        status: p.status ?? 'QUEUED',
        resultUrl: p.result_url ?? null,
        createdAt: p.created_at ?? '',
        completedAt: p.completed_at ?? null,
    };
}

@Injectable({ providedIn: 'root' })
export class ReportApiService {
    private readonly http = inject(HttpClientService);

    list(filters: FilterOptions = {}): Observable<PaginatedResponse<ReportJob>> {
        return crudList(this.http, '/reports', mapApiReport, filters, {
            status: readFilter(filters, 'status'),
        });
    }

    create(type = 'SALES'): Observable<ReportJob | null> {
        return crudCreate(this.http, '/reports', { type }, mapApiReport);
    }

    delete = noopDelete;
}

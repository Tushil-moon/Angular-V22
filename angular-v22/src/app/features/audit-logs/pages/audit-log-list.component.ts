import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { formatDateTime, listTotalCount, orDash, titleCase } from '@features/shared/admin-list.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { AuthService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { map, Observable, of } from 'rxjs';

import type { AuditLogEntry } from '../models/audit-log.model';
import { AuditLogApiService } from '../services/audit-log-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-log-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [kpis]="kpiCards()"
            listTitle="Audit log list"
        />
    `,
})
export class AuditLogListComponent {
    private readonly api = inject(AuditLogApiService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<AuditLogEntry> = {
        title: 'Audit Logs',
        description: 'Inspect security and compliance audit events.',
        entityLabel: 'event',
        managePermission: Permissions.ReadAuditLogs,
        hideCreate: true,
        hideDelete: true,
        columns: [
            { key: 'action', label: 'Action', cell: (i) => titleCase(i.action) },
            {
                key: 'actor',
                label: 'Actor',
                cell: (i) => orDash(i.actorEmail),
                hideBelow: 'sm',
            },
            {
                key: 'ip',
                label: 'IP',
                cell: (i) => orDash(i.ipAddress),
                hideBelow: 'md',
            },
            {
                key: 'created',
                label: 'When',
                cell: (i) => formatDateTime(i.createdAt),
                hideBelow: 'lg',
            },
        ],
        cardTitle: (i) => titleCase(i.action),
        cardSubtitle: (i) => orDash(i.actorEmail),
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0 });
            return listTotalCount((f) => this.api.list(f)).pipe(map((total) => ({ total })));
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0 };
        return [
            { label: 'Total events', value: String(s.total), detail: 'Audit trail', icon: 'shield' },
        ];
    });

    readonly listFn = (f: FilterOptions): Observable<PaginatedResponse<AuditLogEntry>> =>
        this.api.list(f);
    readonly createFn = (): Observable<AuditLogEntry | null> => of(null);
    readonly deleteFn = (): Observable<void> => this.api.delete();
}

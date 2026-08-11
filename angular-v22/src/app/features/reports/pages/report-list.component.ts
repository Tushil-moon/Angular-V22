import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
    catalogStatusVariant,
    formatDateTime,
    listTotalCount,
    orDash,
} from '@features/shared/admin-list.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { AuthService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { forkJoin, Observable, of } from 'rxjs';

import type { ReportJob } from '../models/report.model';
import { ReportApiService } from '../services/report-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-report-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [kpis]="kpiCards()"
            listTitle="Report list"
        />
    `,
})
export class ReportListComponent {
    private readonly api = inject(ReportApiService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<ReportJob> = {
        title: 'Reports',
        description: 'Generate operational and sales reports.',
        entityLabel: 'report',
        managePermission: Permissions.ManageReports,
        hideDelete: true,
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Completed', value: 'COMPLETED' },
            { label: 'Queued', value: 'QUEUED' },
            { label: 'Failed', value: 'FAILED' },
        ],
        columns: [
            { key: 'type', label: 'Type', cell: (i) => i.type },
            {
                key: 'status',
                label: 'Status',
                cell: (i) => i.status,
                badge: (i) => ({ text: i.status, variant: catalogStatusVariant(i.status) }),
            },
            {
                key: 'created',
                label: 'Created',
                cell: (i) => formatDateTime(i.createdAt),
                hideBelow: 'md',
            },
            {
                key: 'result',
                label: 'Result',
                cell: (i) => orDash(i.resultUrl),
                hideBelow: 'lg',
            },
        ],
        cardTitle: (i) => i.type,
        cardSubtitle: (i) => i.status,
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, completed: 0 });
            const count = (status?: string) => listTotalCount((f) => this.api.list(f), status);
            return forkJoin({
                total: count(),
                completed: count('COMPLETED'),
            });
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0, completed: 0 };
        return [
            { label: 'Total reports', value: String(s.total), detail: 'All jobs', icon: 'scroll-text' },
            { label: 'Completed', value: String(s.completed), detail: 'Ready to download', icon: 'check' },
        ];
    });

    readonly listFn = (f: FilterOptions): Observable<PaginatedResponse<ReportJob>> =>
        this.api.list(f);
    readonly createFn = (): Observable<ReportJob | null> => this.api.create('SALES');
    readonly deleteFn = (): Observable<void> => this.api.delete();
}

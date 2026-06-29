import { Component, inject } from '@angular/core';
import type { ForecastPeriod } from '@models/enterprise.model';
import { AuthService, ForecastService } from '@services/index';
import {
    EnterpriseListShellComponent,
    type EnterpriseListConfig,
} from '@shared/components/enterprise-list-shell.component';
import {
    formatEnterpriseCurrency,
    formatEnterpriseDate,
} from '../enterprise/enterprise-list.util';

@Component({
    selector: 'app-forecasting-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
        />
    `,
})
export class ForecastingListComponent {
    private readonly forecastService = inject(ForecastService);
    private readonly authService = inject(AuthService);

    readonly config: EnterpriseListConfig<ForecastPeriod> = {
        title: 'Forecasting',
        description: 'Sales quotas and closed amounts by period',
        entityLabel: 'forecast',
        columns: [
            {
                key: 'period',
                label: 'Period',
                cell: (f) =>
                    `${formatEnterpriseDate(f.periodStart)} – ${formatEnterpriseDate(f.periodEnd)}`,
            },
            { key: 'quota', label: 'Quota', cell: (f) => formatEnterpriseCurrency(f.quota) },
            {
                key: 'closed',
                label: 'Closed',
                cell: (f) => formatEnterpriseCurrency(f.closedAmount),
            },
        ],
    };

    readonly listFn = (filters: Parameters<ForecastService['list']>[0]) =>
        this.forecastService.list(filters);

    readonly createFn = () => {
        const userId = this.authService.currentUser()?.id;
        if (!userId) return Promise.resolve(null);
        const start = new Date();
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        return this.forecastService.create({
            userId,
            periodStart: start.toISOString(),
            periodEnd: end.toISOString(),
            quota: 10000,
        });
    };

    readonly deleteFn = (id: string) => this.forecastService.delete(id);
}

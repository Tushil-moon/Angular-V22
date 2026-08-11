/**
 * Analytics — store performance overview
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { HttpClientService } from '@services/http-client.service';
import { ButtonComponent, IconComponent } from '@shared/components';
import type { IconName } from '@shared/icons';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import { map, of } from 'rxjs';

interface DashboardKpis {
    orders: number;
    revenue: number | string;
    averageOrderValue: number | string;
    newCustomers: number;
    products: number;
    lowStockItems: number;
}

interface DashboardPayload {
    kpis: DashboardKpis;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-analytics-page',
    imports: [RouterLink, ButtonComponent, IconComponent],
    template: `
        <div class="index-page">
            <div class="index-header">
                <div class="index-header-copy">
                    <h1 class="index-title">Analytics</h1>
                    <p class="index-subtitle">Performance snapshot for the last 30 days</p>
                </div>
                <div class="index-actions">
                    <a routerLink="/dashboard/reports" class="inline-flex">
                        <app-button size="sm" type="button" variant="outline">
                            <app-icon name="scroll-text" [size]="14" />
                            Reports
                        </app-button>
                    </a>
                </div>
            </div>

            <div class="index-metrics !lg:grid-cols-3">
                @for (card of kpiCards(); track card.label) {
                    <div class="index-metric">
                        <div class="index-metric-top">
                            <div class="min-w-0">
                                <div class="flex items-center gap-2">
                                    <div class="index-metric-icon">
                                        <app-icon [name]="card.icon" [size]="18" />
                                    </div>
                                    <p class="index-metric-label">{{ card.label }}</p>
                                </div>
                                <p class="index-metric-value">{{ card.value }}</p>
                                <p class="om-kpi-meta">{{ card.hint }}</p>
                            </div>
                        </div>
                    </div>
                }
            </div>

            <div class="home-grid">
                <section class="home-panel">
                    <div class="home-panel-header">
                        <div>
                            <h2 class="home-panel-title">Explore</h2>
                            <p class="home-panel-desc">Open related operational views</p>
                        </div>
                    </div>
                    <div class="home-link-list">
                        @for (link of exploreLinks; track link.route) {
                            <a class="home-link" [routerLink]="link.route">
                                <div class="home-link-icon">
                                    <app-icon [name]="link.icon" [size]="16" />
                                </div>
                                <div class="min-w-0">
                                    <p class="home-link-label">{{ link.label }}</p>
                                    <p class="home-link-desc">{{ link.description }}</p>
                                </div>
                            </a>
                        }
                    </div>
                </section>

                <aside class="home-panel p-4">
                    <h2 class="home-panel-title">Exports</h2>
                    <p class="home-panel-desc mt-1">
                        Generate downloadable operational reports from the reports queue.
                    </p>
                    <a routerLink="/dashboard/reports" class="mt-4 inline-flex w-full">
                        <app-button class="w-full" type="button">Open report jobs</app-button>
                    </a>
                </aside>
            </div>
        </div>
    `,
})
export class AnalyticsPageComponent {
    private readonly http = inject(HttpClientService);
    private readonly auth = inject(AuthService);

    readonly exploreLinks: { label: string; description: string; route: string; icon: IconName }[] = [
        {
            label: 'Orders',
            description: 'Fulfillment impact',
            route: '/dashboard/orders',
            icon: 'shopping-cart',
        },
        {
            label: 'Inventory',
            description: 'Stock risk',
            route: '/dashboard/inventory',
            icon: 'boxes',
        },
        {
            label: 'Customers',
            description: 'Acquisition',
            route: '/dashboard/customers',
            icon: 'users',
        },
        {
            label: 'Products',
            description: 'Assortment size',
            route: '/dashboard/products',
            icon: 'package',
        },
    ];

    readonly resource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of(null as DashboardKpis | null);
            return this.http.get<DashboardPayload>('/analytics/dashboard').pipe(
                map((r) => r.data?.kpis ?? null),
                catchResourceStreamError<DashboardKpis | null>({
                    fallback: null,
                    logMessage: 'Analytics failed:',
                }),
            );
        },
    });

    readonly kpiCards = computed(() => {
        const k = this.resource.value();
        return [
            {
                label: 'Orders',
                value: k?.orders ?? '—',
                hint: 'Checkouts',
                icon: 'shopping-cart' as IconName,
            },
            {
                label: 'Revenue',
                value: this.formatMoney(k?.revenue),
                hint: 'Gross less cancelled',
                icon: 'circle-dollar-sign' as IconName,
            },
            {
                label: 'AOV',
                value: this.formatMoney(k?.averageOrderValue),
                hint: 'Average order value',
                icon: 'chart-column' as IconName,
            },
            {
                label: 'New customers',
                value: k?.newCustomers ?? '—',
                hint: 'Accounts created',
                icon: 'users' as IconName,
            },
            {
                label: 'Products',
                value: k?.products ?? '—',
                hint: 'Catalog size',
                icon: 'package' as IconName,
            },
            {
                label: 'Low stock',
                value: k?.lowStockItems ?? '—',
                hint: 'At-risk SKUs',
                icon: 'boxes' as IconName,
            },
        ];
    });

    formatMoney(value: number | string | null | undefined): string {
        if (value == null) return '—';
        const num = typeof value === 'string' ? Number(value) : value;
        if (Number.isNaN(num)) return '—';
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 2,
        }).format(num);
    }
}

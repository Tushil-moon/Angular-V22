/**
 * Dashboard — Figma E-commerce Admin Main Dashboard layout (our theme tokens)
 * Reference: https://www.figma.com/design/5BaKpvAQuYjEYp8ZKuefFc
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { HttpClientService } from '@services/http-client.service';
import {
    BadgeComponent,
    type BadgeVariant,
    ButtonComponent,
    FlexTableCellComponent,
    FlexTableComponent,
    FlexTableRowComponent,
    type FlexTableColumn,
    IconComponent,
} from '@shared/components';
import type { IconName } from '@shared/icons';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import { ignorePromise } from '@utils/form-display.util';
import { forkJoin, map, of } from 'rxjs';

import { ProductApiService } from '../products/services/product-api.service';

interface DashboardKpis {
    orders: number;
    revenue: number | string;
    averageOrderValue: number | string;
    newCustomers: number;
    products: number;
    lowStockItems: number;
}

interface RecentOrder {
    id: string;
    order_number?: string;
    orderNumber?: string;
    status?: string;
    grand_total?: number | string;
    grandTotal?: number | string;
    currency_code?: string;
    currencyCode?: string;
    created_at?: string;
    createdAt?: string;
    customer_email?: string | null;
    customerEmail?: string | null;
}

interface DashboardPayload {
    kpis: DashboardKpis;
    recentOrders?: RecentOrder[];
    recent_orders?: RecentOrder[];
}

interface RevenuePoint {
    date: string;
    total: number;
}

interface RevenuePayload {
    series?: RevenuePoint[];
}

interface HomeBundle {
    dashboard: DashboardPayload | null;
    revenue: RevenuePoint[];
    products: { id: string; name: string; status: string; featured: boolean }[];
}

interface NormalizedOrder {
    id: string;
    orderNumber: string;
    status: string;
    total: string;
    email: string;
    when: string;
}

interface MetricCard {
    label: string;
    value: string | number;
    hint: string;
    icon: IconName;
    spark: string;
    sparkFill: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-dashboard-home',
    imports: [
        RouterLink,
        ButtonComponent,
        IconComponent,
        BadgeComponent,
        FlexTableComponent,
        FlexTableRowComponent,
        FlexTableCellComponent,
    ],
    template: `
        <div class="index-page">
            <div class="index-header">
                <div class="index-header-copy">
                    <h1 class="index-title">Dashboard</h1>
                    <p class="index-subtitle">
                        Welcome back, {{ displayName() }} · {{ todayLabel() }}
                    </p>
                </div>
                <div class="index-actions">
                    <a routerLink="/dashboard/orders" class="inline-flex">
                        <app-button size="sm" variant="outline" type="button">Orders</app-button>
                    </a>
                    <a routerLink="/dashboard/products/new" class="inline-flex">
                        <app-button size="sm" type="button">
                            <app-icon name="plus" [size]="14" />
                            Add product
                        </app-button>
                    </a>
                </div>
            </div>

            <div class="index-metrics">
                @for (metric of metrics(); track metric.label) {
                    <div class="index-metric">
                        <div class="index-metric-top">
                            <div class="min-w-0">
                                <div class="flex items-center gap-2">
                                    <div class="index-metric-icon">
                                        <app-icon [name]="metric.icon" [size]="18" />
                                    </div>
                                    <p class="index-metric-label">{{ metric.label }}</p>
                                </div>
                                <p class="index-metric-value">{{ metric.value }}</p>
                                <p class="index-metric-hint">{{ metric.hint }}</p>
                            </div>
                            <svg
                                class="index-sparkline"
                                viewBox="0 0 80 40"
                                preserveAspectRatio="none"
                                aria-hidden="true"
                            >
                                <path class="spark-fill" [attr.d]="metric.sparkFill" />
                                <path [attr.d]="metric.spark" />
                            </svg>
                        </div>
                    </div>
                }
            </div>

            @if (needsAttention()) {
                <div class="ops-attention">
                    <div>
                        <p class="ops-attention-title">Inventory needs attention</p>
                        <p class="ops-attention-desc">{{ attentionCopy() }}</p>
                    </div>
                    <a routerLink="/dashboard/inventory" class="inline-flex">
                        <app-button size="sm" variant="outline" type="button">
                            Review stock
                        </app-button>
                    </a>
                </div>
            }

            <div class="home-grid">
                <section class="home-panel">
                    <div class="home-panel-header">
                        <div>
                            <h2 class="home-panel-title">Sales overview</h2>
                            <p class="home-panel-desc">Revenue over the last 30 days</p>
                        </div>
                        <a routerLink="/dashboard/analytics" class="inline-flex">
                            <app-button size="sm" variant="ghost" type="button">Details</app-button>
                        </a>
                    </div>
                    <div class="home-panel-pad">
                        @if (chartReady()) {
                            <div class="home-chart">
                                <svg viewBox="0 0 640 220" preserveAspectRatio="none" aria-hidden="true">
                                    <g class="home-chart-grid">
                                        <line x1="0" y1="55" x2="640" y2="55" />
                                        <line x1="0" y1="110" x2="640" y2="110" />
                                        <line x1="0" y1="165" x2="640" y2="165" />
                                    </g>
                                    <path class="home-chart-area" [attr.d]="chartArea()" />
                                    <path class="home-chart-line" [attr.d]="chartLine()" />
                                </svg>
                            </div>
                            <div class="home-chart-labels">
                                @for (label of chartLabels(); track label) {
                                    <span>{{ label }}</span>
                                }
                            </div>
                        } @else {
                            <div class="index-empty py-12">
                                <p class="index-empty-title">No sales data yet</p>
                                <p class="index-empty-desc">
                                    Charts appear after orders start coming in.
                                </p>
                            </div>
                        }
                    </div>
                </section>

                <aside class="home-panel">
                    <div class="home-panel-header">
                        <div>
                            <h2 class="home-panel-title">Top products</h2>
                            <p class="home-panel-desc">Catalog highlights</p>
                        </div>
                        <a routerLink="/dashboard/products" class="inline-flex">
                            <app-button size="sm" variant="ghost" type="button">View all</app-button>
                        </a>
                    </div>
                    @if (topProducts().length === 0) {
                        <div class="index-empty py-10">
                            <p class="index-empty-desc">No products to rank yet.</p>
                        </div>
                    } @else {
                        <div class="home-rank-list">
                            @for (product of topProducts(); track product.id; let i = $index) {
                                <div class="home-rank-item">
                                    <div class="home-rank-avatar">{{ i + 1 }}</div>
                                    <div class="home-rank-body">
                                        <p class="home-rank-title">{{ product.name }}</p>
                                        <p class="home-rank-meta">{{ product.status }}</p>
                                        <div class="home-rank-bar">
                                            <div
                                                class="home-rank-bar-fill"
                                                [style.width.%]="product.score"
                                            ></div>
                                        </div>
                                    </div>
                                    <span class="home-rank-value">{{ product.score }}%</span>
                                </div>
                            }
                        </div>
                    }
                </aside>
            </div>

            <section class="home-panel">
                <div class="home-panel-header">
                    <div>
                        <h2 class="home-panel-title">Recent orders</h2>
                        <p class="home-panel-desc">Latest storefront checkouts</p>
                    </div>
                    <a routerLink="/dashboard/orders" class="inline-flex">
                        <app-button size="sm" variant="ghost" type="button">View all</app-button>
                    </a>
                </div>
                <div class="home-panel-body">
                    <app-flex-table
                        [columns]="orderColumns"
                        [fill]="false"
                        [loading]="isLoading()"
                        [empty]="!isLoading() && recentOrders().length === 0"
                        emptyTitle="No orders yet"
                        emptyDescription="New orders will show up here after checkout."
                        [flush]="true"
                        [skeletonRowCount]="5"
                    >
                        @for (order of recentOrders(); track order.id) {
                            <app-flex-table-row
                                class="home-table-row"
                                [interactive]="true"
                                (click)="openOrder(order.id)"
                            >
                                <app-flex-table-cell column="order">
                                    <span class="index-cell-primary">{{ order.orderNumber }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="customer">
                                    <span class="index-cell-muted">{{ order.email }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="date">
                                    <span class="index-cell-muted">{{ order.when }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="total">
                                    <span class="index-cell-money">{{ order.total }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="status">
                                    <app-badge [variant]="statusVariant(order.status)">
                                        {{ order.status }}
                                    </app-badge>
                                </app-flex-table-cell>
                            </app-flex-table-row>
                        }
                    </app-flex-table>
                </div>
            </section>
        </div>
    `,
})
export class DashboardHomeComponent {
    private readonly authService = inject(AuthService);
    private readonly http = inject(HttpClientService);
    private readonly productApi = inject(ProductApiService);
    private readonly router = inject(Router);

    readonly orderColumns: FlexTableColumn[] = [
        { key: 'order', label: 'Order', grid: 'minmax(7rem, 1fr)', primary: true },
        { key: 'customer', label: 'Customer', grid: 'minmax(9rem, 1.3fr)' },
        { key: 'date', label: 'Date', grid: 'minmax(7rem, 1fr)', hideBelow: 'md' },
        { key: 'total', label: 'Amount', grid: 'minmax(5rem, 0.7fr)' },
        { key: 'status', label: 'Status', grid: 'minmax(6rem, 0.8fr)' },
    ];

    readonly displayName = computed(() => {
        const user = this.authService.currentUser();
        if (user?.email) return user.email.split('@')[0];
        return 'Admin';
    });

    readonly todayLabel = computed(() =>
        new Intl.DateTimeFormat(undefined, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
        }).format(new Date()),
    );

    readonly homeResource = rxResource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) {
                return of({
                    dashboard: null,
                    revenue: [],
                    products: [],
                } satisfies HomeBundle);
            }

            return forkJoin({
                dashboard: this.http.get<DashboardPayload>('/analytics/dashboard').pipe(
                    map((res) => res.data ?? null),
                    catchResourceStreamError<DashboardPayload | null>({
                        fallback: null,
                        logMessage: 'Dashboard analytics unavailable:',
                    }),
                ),
                revenue: this.http.get<RevenuePayload>('/analytics/revenue').pipe(
                    map((res) => res.data?.series ?? []),
                    catchResourceStreamError<RevenuePoint[]>({
                        fallback: [],
                        logMessage: 'Revenue series unavailable:',
                    }),
                ),
                products: this.productApi.list({ page: 1, pageSize: 5 }).pipe(
                    map((res) =>
                        res.data.map((p) => ({
                            id: p.id,
                            name: p.name,
                            status: p.status,
                            featured: p.featured,
                        })),
                    ),
                    catchResourceStreamError<{ id: string; name: string; status: string; featured: boolean }[]>({
                        fallback: [],
                        logMessage: 'Products unavailable:',
                    }),
                ),
            });
        },
    });

    readonly kpis = computed(() => this.homeResource.value()?.dashboard?.kpis ?? null);
    readonly isLoading = computed(() => this.homeResource.isLoading());
    readonly revenueSeries = computed(() => this.homeResource.value()?.revenue ?? []);

    readonly metrics = computed((): MetricCard[] => {
        const k = this.kpis();
        const series = this.revenueSeries();
        const sparkPoints = this.sparkPoints(series);
        return [
            {
                label: 'Total sales',
                value: this.formatMoney(k?.revenue),
                hint: 'Last 30 days',
                icon: 'credit-card',
                spark: this.sparkPath(sparkPoints),
                sparkFill: this.sparkFill(sparkPoints),
            },
            {
                label: 'Orders',
                value: k?.orders ?? '—',
                hint: 'Last 30 days',
                icon: 'shopping-cart',
                spark: this.sparkPath(this.offsetSpark(sparkPoints, 0.15)),
                sparkFill: this.sparkFill(this.offsetSpark(sparkPoints, 0.15)),
            },
            {
                label: 'Customers',
                value: k?.newCustomers ?? '—',
                hint: 'New accounts',
                icon: 'users',
                spark: this.sparkPath(this.offsetSpark(sparkPoints, 0.28)),
                sparkFill: this.sparkFill(this.offsetSpark(sparkPoints, 0.28)),
            },
            {
                label: 'Low stock',
                value: k?.lowStockItems ?? '—',
                hint: `${k?.products ?? '—'} products in catalog`,
                icon: 'boxes',
                spark: this.sparkPath(this.offsetSpark(sparkPoints, 0.4)),
                sparkFill: this.sparkFill(this.offsetSpark(sparkPoints, 0.4)),
            },
        ];
    });

    readonly topProducts = computed(() => {
        const items = this.homeResource.value()?.products ?? [];
        const count = Math.max(items.length, 1);
        return items.map((item, index) => ({
            ...item,
            score: Math.max(28, Math.round(((count - index) / count) * 100) - (item.featured ? 0 : 8)),
        }));
    });

    readonly recentOrders = computed((): NormalizedOrder[] => {
        const payload = this.homeResource.value()?.dashboard;
        const raw = payload?.recentOrders ?? payload?.recent_orders ?? [];
        return raw.map((order) => {
            const total = order.grandTotal ?? order.grand_total;
            const currency = order.currencyCode ?? order.currency_code ?? 'USD';
            const created = order.createdAt ?? order.created_at;
            return {
                id: order.id,
                orderNumber: order.orderNumber ?? order.order_number ?? order.id.slice(0, 8),
                status: order.status ?? 'PENDING',
                total: this.formatMoney(total, currency),
                email: order.customerEmail ?? order.customer_email ?? 'Guest',
                when: this.formatWhen(created),
            };
        });
    });

    readonly chartReady = computed(() => this.revenueSeries().length > 1 || (this.kpis()?.orders ?? 0) > 0);

    readonly chartPoints = computed(() => {
        const series = this.revenueSeries();
        if (series.length >= 2) {
            return series.map((point) => Number(point.total) || 0);
        }
        // Soft placeholder curve when orders exist but series is sparse
        const base = Number(this.kpis()?.revenue ?? 0) || 40;
        return [0.35, 0.42, 0.38, 0.55, 0.48, 0.62, 0.58, 0.74, 0.68, 0.82, 0.9, 1].map(
            (n) => n * (base || 100),
        );
    });

    readonly chartLine = computed(() => this.areaPath(this.chartPoints(), false));
    readonly chartArea = computed(() => this.areaPath(this.chartPoints(), true));

    readonly chartLabels = computed(() => {
        const series = this.revenueSeries();
        if (series.length >= 4) {
            const picks = [0, Math.floor(series.length / 3), Math.floor((series.length * 2) / 3), series.length - 1];
            return picks.map((i) => this.shortDate(series[i]?.date));
        }
        return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    });

    readonly needsAttention = computed(() => (this.kpis()?.lowStockItems ?? 0) > 0);

    readonly attentionCopy = computed(() => {
        const low = this.kpis()?.lowStockItems ?? 0;
        if (low <= 0) return '';
        return `${low} SKU${low === 1 ? '' : 's'} at or below the low-stock threshold.`;
    });

    openOrder(id: string): void {
        ignorePromise(this.router.navigate(['/dashboard/orders', id]));
    }

    statusVariant(status: string): BadgeVariant {
        switch (status) {
            case 'DELIVERED':
            case 'COMPLETED':
                return 'success';
            case 'CANCELLED':
            case 'REFUNDED':
                return 'destructive';
            case 'PENDING':
                return 'warning';
            default:
                return 'outline';
        }
    }

    formatMoney(value: number | string | null | undefined, currency = 'USD'): string {
        if (value == null) return '—';
        const num = typeof value === 'string' ? Number(value) : value;
        if (Number.isNaN(num)) return '—';
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
            maximumFractionDigits: 2,
        }).format(num);
    }

    private formatWhen(value: string | undefined): string {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(date);
    }

    private shortDate(value: string | undefined): string {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value.slice(5);
        return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
    }

    private sparkPoints(series: RevenuePoint[]): number[] {
        if (series.length >= 4) {
            return series.slice(-8).map((p) => Number(p.total) || 0);
        }
        return [12, 18, 14, 22, 19, 28, 24, 32];
    }

    private offsetSpark(points: number[], amount: number): number[] {
        return points.map((value, index) => value * (1 - amount + ((index % 3) * amount) / 3));
    }

    private sparkPath(values: number[]): string {
        const coords = this.normalize(values, 80, 36, 2);
        if (coords.length === 0) return '';
        return coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x} ${c.y}`).join(' ');
    }

    private sparkFill(values: number[]): string {
        const coords = this.normalize(values, 80, 36, 2);
        if (coords.length === 0) return '';
        const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x} ${c.y}`).join(' ');
        const last = coords[coords.length - 1];
        const first = coords[0];
        return `${line} L${last.x} 40 L${first.x} 40 Z`;
    }

    private areaPath(values: number[], filled: boolean): string {
        const coords = this.normalize(values, 640, 200, 10);
        if (coords.length === 0) return '';
        const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x} ${c.y}`).join(' ');
        if (!filled) return line;
        const last = coords[coords.length - 1];
        const first = coords[0];
        return `${line} L${last.x} 220 L${first.x} 220 Z`;
    }

    private normalize(
        values: number[],
        width: number,
        height: number,
        padY: number,
    ): { x: number; y: number }[] {
        if (values.length === 0) return [];
        const min = Math.min(...values);
        const max = Math.max(...values);
        const span = max - min || 1;
        return values.map((value, index) => {
            const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
            const y = padY + (1 - (value - min) / span) * height;
            return { x, y };
        });
    }
}

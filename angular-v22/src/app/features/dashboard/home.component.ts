/**
 * Dashboard — Figma DealPort E-commerce Admin (node 5:1346)
 * Reference: https://www.figma.com/design/M3bpAZpkKNppHghX3SeMQU
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { CategoryApiService } from '@features/categories/services/category-api.service';
import { ProductApiService } from '@features/products/services/product-api.service';
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
import { SearchInputComponent } from '@shared/components/search-input.component';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import { ignorePromise } from '@utils/form-display.util';
import { forkJoin, map, of } from 'rxjs';

interface DashboardKpis {
    orders?: number;
    revenue?: number | string;
    average_order_value?: number | string;
    averageOrderValue?: number | string;
    new_customers?: number;
    newCustomers?: number;
    products?: number;
    low_stock_items?: number;
    lowStockItems?: number;
    pending_orders?: number;
    pendingOrders?: number;
    cancelled_orders?: number;
    cancelledOrders?: number;
    previous_period_revenue?: number | string;
    previousPeriodRevenue?: number | string;
    previous_period_orders?: number;
    previousPeriodOrders?: number;
}

interface TopProductRow {
    id: string;
    name: string;
    sku?: string;
    image_url?: string | null;
    imageUrl?: string | null;
    status?: string;
    total_sold?: number;
    totalSold?: number;
    revenue?: number | string;
    price?: number | string | null;
}

interface CountrySale {
    country_code?: string;
    countryCode?: string;
    order_count?: number;
    orderCount?: number;
    revenue?: number | string;
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
}

interface DashboardPayload {
    kpis: DashboardKpis;
    recentOrders?: RecentOrder[];
    recent_orders?: RecentOrder[];
    topProducts?: TopProductRow[];
    top_products?: TopProductRow[];
    salesByCountry?: CountrySale[];
    sales_by_country?: CountrySale[];
}

interface RevenuePoint {
    date: string;
    total: number;
}

interface RevenuePayload {
    series?: RevenuePoint[];
}

interface CategoryItem {
    id: string;
    name: string;
}

interface SuggestedProduct {
    id: string;
    name: string;
    price: string;
}

interface HomeBundle {
    dashboard: DashboardPayload | null;
    revenue: RevenuePoint[];
    categories: CategoryItem[];
    suggestions: SuggestedProduct[];
}

interface NormalizedOrder {
    id: string;
    index: number;
    orderNumber: string;
    status: string;
    statusLabel: string;
    total: string;
    when: string;
}

interface KpiCard {
    title: string;
    value: string;
    trendLabel: string;
    trendPct: string;
    trendUp: boolean;
    compareText: string;
    compareHighlight: string;
    detailsRoute: string;
    split?: { pending: string; cancelled: string };
}

type ReportPeriod = 'this' | 'last';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-dashboard-home',
    imports: [
        RouterLink,
        ButtonComponent,
        BadgeComponent,
        IconComponent,
        SearchInputComponent,
        FlexTableComponent,
        FlexTableRowComponent,
        FlexTableCellComponent,
    ],
    template: `
        <div class="dashboard-page">
            <div class="dashboard-kpi-row">
                @for (card of kpiCards(); track card.title) {
                    <article class="dashboard-kpi-card">
                        <div class="dashboard-kpi-head">
                            <div>
                                <h2 class="dashboard-kpi-title">{{ card.title }}</h2>
                                <p class="dashboard-kpi-period">Last 7 days</p>
                            </div>
                            <button type="button" class="dashboard-kpi-menu" aria-label="More options">
                                <app-icon name="more-vertical" [size]="16" />
                            </button>
                        </div>

                        @if (card.split) {
                            <div class="dashboard-kpi-split">
                                <div>
                                    <p class="dashboard-kpi-split-label">Pending</p>
                                    <p class="dashboard-kpi-split-value">{{ card.split.pending }}</p>
                                </div>
                                <div>
                                    <p class="dashboard-kpi-split-label">Canceled</p>
                                    <p class="dashboard-kpi-split-value">{{ card.split.cancelled }}</p>
                                </div>
                            </div>
                        } @else {
                            <div class="dashboard-kpi-value-row">
                                <p class="dashboard-kpi-value">{{ card.value }}</p>
                                <div class="flex items-end gap-1">
                                    <span class="dashboard-kpi-trend-label">{{ card.trendLabel }}</span>
                                    <span
                                        class="dashboard-kpi-trend"
                                        [class.dashboard-kpi-trend-up]="card.trendUp"
                                        [class.dashboard-kpi-trend-down]="!card.trendUp"
                                    >
                                        <app-icon
                                            [name]="card.trendUp ? 'arrow-up' : 'arrow-down'"
                                            [size]="14"
                                        />
                                        {{ card.trendPct }}
                                    </span>
                                </div>
                            </div>
                            <p class="dashboard-kpi-compare">
                                Previous 7 days
                                <span class="dashboard-kpi-compare-accent">{{
                                    card.compareHighlight
                                }}</span>
                                {{ card.compareText }}
                            </p>
                        }

                        <div class="dashboard-kpi-footer">
                            <a [routerLink]="card.detailsRoute" class="inline-flex">
                                <app-button size="sm" variant="outline" type="button">Details</app-button>
                            </a>
                        </div>
                    </article>
                }
            </div>

            <div class="dashboard-mid-grid">
                <section class="home-panel">
                    <div class="home-panel-header">
                        <h2 class="home-panel-title">Report for this week</h2>
                        <div class="dashboard-period-toggle">
                            <button
                                type="button"
                                class="dashboard-period-btn"
                                [class.dashboard-period-btn-active]="reportPeriod() === 'this'"
                                (click)="setReportPeriod('this')"
                            >
                                This week
                            </button>
                            <button
                                type="button"
                                class="dashboard-period-btn"
                                [class.dashboard-period-btn-active]="reportPeriod() === 'last'"
                                (click)="setReportPeriod('last')"
                            >
                                Last week
                            </button>
                        </div>
                    </div>

                    <div class="dashboard-payment-tabs">
                        @for (tab of paymentTabs(); track tab.id) {
                            <button
                                type="button"
                                class="dashboard-payment-tab"
                                [class.dashboard-payment-tab-active]="paymentTab() === tab.id"
                                (click)="paymentTab.set(tab.id)"
                            >
                                <span class="dashboard-payment-tab-label">{{ tab.label }}</span>
                                <span class="dashboard-payment-tab-value">{{ tab.value }}</span>
                            </button>
                        }
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
                                    <path class="dashboard-chart-accent-area" [attr.d]="chartArea()" />
                                    <path class="dashboard-chart-accent-line" [attr.d]="chartLine()" />
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
                    <div class="dashboard-live-metric">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="dashboard-live-label">New customers</p>
                                <p class="dashboard-live-value">{{ liveMetricValue() }}</p>
                            </div>
                            <button type="button" class="dashboard-kpi-menu" aria-label="More options">
                                <app-icon name="more-vertical" [size]="16" />
                            </button>
                        </div>
                        <svg
                            class="dashboard-bar-spark"
                            viewBox="0 0 320 35"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                        >
                            @for (bar of barSpark(); track $index) {
                                <rect [attr.x]="$index * 11" [attr.y]="35 - bar" width="8" [attr.height]="bar" rx="2" />
                            }
                        </svg>
                    </div>

                    <div class="dashboard-country-section">
                        <div class="dashboard-country-head">
                            <h3 class="home-panel-title">Sales by Country</h3>
                            <span class="text-sm text-muted-foreground">Sales</span>
                        </div>
                        @if (countrySales().length === 0) {
                            <p class="text-sm text-muted-foreground">No regional data yet.</p>
                        } @else {
                            @for (row of countrySales(); track row.countryCode) {
                                <div class="dashboard-country-row">
                                    <div class="dashboard-country-flag">{{ row.countryCode }}</div>
                                    <div class="dashboard-country-meta">
                                        <p class="dashboard-country-code">{{ row.countryCode }}</p>
                                        <p class="dashboard-country-orders">{{ row.orderCount }} orders</p>
                                    </div>
                                    <div class="dashboard-country-bar-wrap">
                                        <span class="dashboard-country-change">{{ row.share }}%</span>
                                        <div class="dashboard-country-bar">
                                            <div
                                                class="dashboard-country-bar-fill"
                                                [style.width.%]="row.share"
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            }
                        }
                        <div class="dashboard-kpi-footer !justify-center pt-2">
                            <a routerLink="/dashboard/analytics" class="inline-flex">
                                <app-button size="sm" variant="outline" type="button">
                                    View Insight
                                </app-button>
                            </a>
                        </div>
                    </div>
                </aside>
            </div>

            <div class="dashboard-lower-grid">
                <section class="home-panel">
                    <div class="home-panel-header">
                        <h2 class="home-panel-title">Transaction</h2>
                        <a routerLink="/dashboard/orders" class="inline-flex">
                            <app-button size="sm" variant="outline" type="button">
                                Filter
                                <app-icon name="arrow-up-down" [size]="14" />
                            </app-button>
                        </a>
                    </div>
                    <app-flex-table
                        [columns]="transactionColumns"
                        [fill]="false"
                        [loading]="isLoading()"
                        [empty]="!isLoading() && recentOrders().length === 0"
                        emptyTitle="No transactions yet"
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
                                <app-flex-table-cell column="no">
                                    <span class="om-row-num">{{ order.index }}.</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="id">
                                    <span class="index-cell-primary">#{{ order.orderNumber }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="date">
                                    <span class="index-cell-muted">{{ order.when }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="status">
                                    <app-badge [variant]="statusVariant(order.status)">
                                        {{ order.statusLabel }}
                                    </app-badge>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="amount">
                                    <span class="index-cell-money">{{ order.total }}</span>
                                </app-flex-table-cell>
                            </app-flex-table-row>
                        }
                    </app-flex-table>
                    <div class="dashboard-kpi-footer px-5 pb-4">
                        <a routerLink="/dashboard/orders" class="inline-flex">
                            <app-button size="sm" variant="ghost" type="button">Details</app-button>
                        </a>
                    </div>
                </section>

                <aside class="home-panel">
                    <div class="home-panel-header !items-start">
                        <div>
                            <h2 class="home-panel-title">Top Products</h2>
                            <a routerLink="/dashboard/products" class="inline-flex">
                                <app-button size="sm" variant="link" type="button">All product</app-button>
                            </a>
                        </div>
                    </div>
                    <div class="dashboard-product-search">
                        <app-search-input
                            placeholder="Search"
                            ariaLabel="Search top products"
                            (searchChange)="topProductQuery.set($event)"
                        />
                    </div>
                    @if (filteredTopProducts().length === 0) {
                        <div class="index-empty py-8">
                            <p class="index-empty-desc">No products to show yet.</p>
                        </div>
                    } @else {
                        <div class="dashboard-product-list">
                            @for (product of filteredTopProducts(); track product.id) {
                                <div class="dashboard-product-row">
                                    <div class="dashboard-product-thumb">
                                        @if (product.imageUrl) {
                                            <img [src]="product.imageUrl" [alt]="product.name" />
                                        } @else {
                                            {{ product.name.slice(0, 1) }}
                                        }
                                    </div>
                                    <div class="dashboard-product-body">
                                        <p class="dashboard-product-name">{{ product.name }}</p>
                                        <p class="dashboard-product-sku">Item: #{{ product.sku || product.id.slice(0, 8) }}</p>
                                    </div>
                                    <span class="dashboard-product-price">{{ product.revenueLabel }}</span>
                                </div>
                            }
                        </div>
                    }
                </aside>
            </div>

            <div class="dashboard-bottom-grid">
                <section class="home-panel">
                    <div class="home-panel-header">
                        <h2 class="home-panel-title">Best selling product</h2>
                        <app-button size="sm" variant="outline" type="button">
                            Filter
                            <app-icon name="arrow-up-down" [size]="14" />
                        </app-button>
                    </div>
                    <app-flex-table
                        [columns]="bestSellerColumns"
                        [fill]="false"
                        [loading]="isLoading()"
                        [empty]="!isLoading() && bestSellers().length === 0"
                        emptyTitle="No best sellers yet"
                        emptyDescription="Top sellers appear after orders are placed."
                        [flush]="true"
                        [skeletonRowCount]="4"
                    >
                        @for (product of bestSellers(); track product.id) {
                            <app-flex-table-row
                                class="home-table-row"
                                [interactive]="true"
                                (click)="openProduct(product.id)"
                            >
                                <app-flex-table-cell column="product">
                                    <div class="dashboard-table-product">
                                        <div class="dashboard-table-product-thumb">
                                            @if (product.imageUrl) {
                                                <img [src]="product.imageUrl" [alt]="product.name" />
                                            } @else {
                                                {{ product.name.slice(0, 1) }}
                                            }
                                        </div>
                                        <span class="index-cell-primary">{{ product.name }}</span>
                                    </div>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="orders">
                                    <span class="index-cell-muted">{{ product.totalSold }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="status">
                                    <app-badge [variant]="productStatusVariant(product.statusLabel)">
                                        {{ product.statusLabel }}
                                    </app-badge>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="price">
                                    <span class="index-cell-money">{{ product.priceLabel }}</span>
                                </app-flex-table-cell>
                            </app-flex-table-row>
                        }
                    </app-flex-table>
                    <div class="dashboard-kpi-footer px-5 pb-4">
                        <a routerLink="/dashboard/products" class="inline-flex">
                            <app-button size="sm" variant="ghost" type="button">Details</app-button>
                        </a>
                    </div>
                </section>

                <aside class="home-panel dashboard-add-panel">
                    <div class="dashboard-add-head">
                        <h2 class="home-panel-title">Add New Product</h2>
                        <a routerLink="/dashboard/products/new" class="inline-flex">
                            <app-button size="sm" variant="link" type="button">
                                <app-icon name="plus-square" [size]="14" />
                                Add New
                            </app-button>
                        </a>
                    </div>

                    <p class="dashboard-add-section-label">Categories</p>
                    @for (category of categories(); track category.id) {
                        <a
                            [routerLink]="['/dashboard/products/new']"
                            [queryParams]="{ categoryId: category.id }"
                            class="dashboard-category-row"
                        >
                            <div class="dashboard-category-thumb">📦</div>
                            <span class="dashboard-category-name">{{ category.name }}</span>
                            <app-icon name="chevron-right" [size]="16" className="text-muted-foreground" />
                        </a>
                    }
                    <a routerLink="/dashboard/categories" class="dashboard-see-more">See more</a>

                    <p class="dashboard-add-section-label mt-4">Product</p>
                    <div class="divide-y divide-border">
                        @for (item of suggestions(); track item.id) {
                            <div class="dashboard-quick-add-row">
                                <div class="dashboard-quick-add-info">
                                    <p class="dashboard-quick-add-name">{{ item.name }}</p>
                                    <p class="dashboard-quick-add-price">{{ item.price }}</p>
                                </div>
                                <a routerLink="/dashboard/products/new" class="inline-flex shrink-0">
                                    <app-button size="sm" variant="outline" type="button">
                                        <app-icon name="plus" [size]="14" />
                                        Add
                                    </app-button>
                                </a>
                            </div>
                        }
                    </div>
                    <a routerLink="/dashboard/products" class="dashboard-see-more">See more</a>
                </aside>
            </div>
        </div>
    `,
})
export class DashboardHomeComponent {
    private readonly authService = inject(AuthService);
    private readonly http = inject(HttpClientService);
    private readonly productApi = inject(ProductApiService);
    private readonly categoryApi = inject(CategoryApiService);
    private readonly router = inject(Router);

    readonly reportPeriod = signal<ReportPeriod>('this');
    readonly paymentTab = signal('all');
    readonly topProductQuery = signal('');

    readonly transactionColumns: FlexTableColumn[] = [
        { key: 'no', label: 'No', grid: '3rem' },
        { key: 'id', label: 'Id Customer', grid: 'minmax(6rem, 1fr)', primary: true },
        { key: 'date', label: 'Order Date', grid: 'minmax(8rem, 1.2fr)', hideBelow: 'md' },
        { key: 'status', label: 'Status', grid: 'minmax(6rem, 0.9fr)' },
        { key: 'amount', label: 'Amount', grid: 'minmax(5rem, 0.7fr)' },
    ];

    readonly bestSellerColumns: FlexTableColumn[] = [
        { key: 'product', label: 'Product', grid: 'minmax(10rem, 1.5fr)', primary: true },
        { key: 'orders', label: 'Total Order', grid: 'minmax(6rem, 1fr)' },
        { key: 'status', label: 'Status', grid: 'minmax(6rem, 0.9fr)' },
        { key: 'price', label: 'Price', grid: 'minmax(5rem, 0.7fr)' },
    ];

    readonly homeResource = rxResource({
        params: () =>
            this.authService.isAuthenticated()
                ? { period: this.reportPeriod() }
                : undefined,
        stream: ({ params }) => {
            if (!params) {
                return of({
                    dashboard: null,
                    revenue: [],
                    categories: [],
                    suggestions: [],
                } satisfies HomeBundle);
            }

            const kpiRange = this.dateRange('this');
            const chartRange = this.dateRange(params.period);

            return forkJoin({
                dashboard: this.http
                    .get<DashboardPayload>('/analytics/dashboard', {
                        params: { from: kpiRange.from, to: kpiRange.to },
                    })
                    .pipe(
                        map((res) => res.data ?? null),
                        catchResourceStreamError<DashboardPayload | null>({
                            fallback: null,
                            logMessage: 'Dashboard analytics unavailable:',
                        }),
                    ),
                revenue: this.http
                    .get<RevenuePayload>('/analytics/revenue', {
                        params: { from: chartRange.from, to: chartRange.to },
                    })
                    .pipe(
                        map((res) => res.data?.series ?? []),
                        catchResourceStreamError<RevenuePoint[]>({
                            fallback: [],
                            logMessage: 'Revenue series unavailable:',
                        }),
                    ),
                categories: this.categoryApi.list({ page: 1, pageSize: 3 }).pipe(
                    map((res) => res.data.map((c) => ({ id: c.id, name: c.name }))),
                    catchResourceStreamError<CategoryItem[]>({
                        fallback: [],
                        logMessage: 'Categories unavailable:',
                    }),
                ),
                suggestions: this.productApi.list({ page: 1, pageSize: 3, status: 'DRAFT' }).pipe(
                    map((res) =>
                        res.data.map((p) => ({
                            id: p.id,
                            name: p.name,
                            price: '—',
                        })),
                    ),
                    catchResourceStreamError<SuggestedProduct[]>({
                        fallback: [],
                        logMessage: 'Suggested products unavailable:',
                    }),
                ),
            });
        },
    });

    readonly kpis = computed(() => this.homeResource.value()?.dashboard?.kpis ?? null);
    readonly isLoading = computed(() => this.homeResource.isLoading());
    readonly revenueSeries = computed(() => this.homeResource.value()?.revenue ?? []);

    readonly kpiCards = computed((): KpiCard[] => {
        const k = this.kpis();
        const revenue = this.num(k?.revenue);
        const orders = k?.orders ?? 0;
        const prevRevenue = this.num(k?.previousPeriodRevenue ?? k?.previous_period_revenue);
        const prevOrders = k?.previousPeriodOrders ?? k?.previous_period_orders ?? 0;
        const pending = k?.pendingOrders ?? k?.pending_orders ?? 0;
        const cancelled = k?.cancelledOrders ?? k?.cancelled_orders ?? 0;

        return [
            {
                title: 'Total Sales',
                value: this.formatMoney(revenue),
                trendLabel: 'Sales',
                trendPct: this.trendPct(revenue, prevRevenue),
                trendUp: revenue >= prevRevenue,
                compareHighlight: `(${this.formatMoney(prevRevenue)})`,
                compareText: '',
                detailsRoute: '/dashboard/analytics',
            },
            {
                title: 'Total Orders',
                value: String(orders),
                trendLabel: 'order',
                trendPct: this.trendPct(orders, prevOrders),
                trendUp: orders >= prevOrders,
                compareHighlight: `(${prevOrders})`,
                compareText: 'orders',
                detailsRoute: '/dashboard/orders',
            },
            {
                title: 'Pending & Canceled',
                value: '',
                trendLabel: '',
                trendPct: '',
                trendUp: true,
                compareHighlight: '',
                compareText: '',
                detailsRoute: '/dashboard/orders',
                split: {
                    pending: String(pending),
                    cancelled: String(cancelled),
                },
            },
        ];
    });

    readonly paymentTabs = computed(() => {
        const revenue = this.num(this.kpis()?.revenue);
        const splits = [
            { id: 'all', label: 'All', share: 1 },
            { id: 'visa', label: 'Visa', share: 0.4 },
            { id: 'mastercard', label: 'Mastercard', share: 0.25 },
            { id: 'paypal', label: 'Paypal', share: 0.2 },
            { id: 'amex', label: 'Amex', share: 0.15 },
        ];
        return splits.map((item) => ({
            id: item.id,
            label: item.label,
            value: this.formatCompactMoney(revenue * item.share),
        }));
    });

    readonly liveMetricValue = computed(() => {
        const k = this.kpis();
        return String(k?.newCustomers ?? k?.new_customers ?? 0);
    });

    readonly barSpark = computed(() => {
        const series = this.revenueSeries();
        const values =
            series.length >= 4
                ? series.slice(-20).map((p) => Number(p.total) || 0)
                : [12, 18, 14, 22, 19, 28, 24, 32, 20, 26, 30, 35];
        const max = Math.max(...values, 1);
        return values.map((v) => Math.max(4, (v / max) * 35));
    });

    readonly countrySales = computed(() => {
        const payload = this.homeResource.value()?.dashboard;
        const raw = payload?.salesByCountry ?? payload?.sales_by_country ?? [];
        const maxRevenue = Math.max(
            ...raw.map((r) => this.num(r.revenue)),
            1,
        );
        return raw.map((row) => {
            const revenue = this.num(row.revenue);
            const countryCode = row.countryCode ?? row.country_code ?? '—';
            return {
                countryCode,
                orderCount: row.orderCount ?? row.order_count ?? 0,
                share: Math.round((revenue / maxRevenue) * 100),
            };
        });
    });

    readonly topProductsRaw = computed(() => {
        const payload = this.homeResource.value()?.dashboard;
        const raw = payload?.topProducts ?? payload?.top_products ?? [];
        return raw.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku ?? '',
            imageUrl: p.imageUrl ?? p.image_url ?? null,
            revenueLabel: this.formatMoney(p.revenue),
        }));
    });

    readonly filteredTopProducts = computed(() => {
        const q = this.topProductQuery().trim().toLowerCase();
        const items = this.topProductsRaw();
        if (!q) return items.slice(0, 5);
        return items.filter(
            (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
        );
    });

    readonly bestSellers = computed(() => {
        const payload = this.homeResource.value()?.dashboard;
        const raw = payload?.topProducts ?? payload?.top_products ?? [];
        return raw.slice(0, 4).map((p) => ({
            id: p.id,
            name: p.name,
            imageUrl: p.imageUrl ?? p.image_url ?? null,
            totalSold: p.totalSold ?? p.total_sold ?? 0,
            statusLabel: this.productStatusLabel(p.status),
            priceLabel: this.formatMoney(p.price ?? p.revenue),
        }));
    });

    readonly recentOrders = computed((): NormalizedOrder[] => {
        const payload = this.homeResource.value()?.dashboard;
        const raw = payload?.recentOrders ?? payload?.recent_orders ?? [];
        return raw.map((order, index) => {
            const total = order.grandTotal ?? order.grand_total;
            const currency = order.currencyCode ?? order.currency_code ?? 'USD';
            const created = order.createdAt ?? order.created_at;
            const status = order.status ?? 'PENDING';
            return {
                id: order.id,
                index: index + 1,
                orderNumber: order.orderNumber ?? order.order_number ?? order.id.slice(0, 8),
                status,
                statusLabel: this.orderStatusLabel(status),
                total: this.formatMoney(total, currency),
                when: this.formatWhen(created),
            };
        });
    });

    readonly categories = computed(() => this.homeResource.value()?.categories ?? []);
    readonly suggestions = computed(() => this.homeResource.value()?.suggestions ?? []);

    readonly chartReady = computed(
        () => this.revenueSeries().length > 1 || (this.kpis()?.orders ?? 0) > 0,
    );

    readonly chartPoints = computed(() => {
        const series = this.revenueSeries();
        if (series.length >= 2) {
            return series.map((point) => Number(point.total) || 0);
        }
        const base = this.num(this.kpis()?.revenue) || 40;
        return [0.35, 0.42, 0.38, 0.55, 0.48, 0.62, 0.58, 0.74, 0.68, 0.82, 0.9, 1].map(
            (n) => n * (base || 100),
        );
    });

    readonly chartLine = computed(() => this.areaPath(this.chartPoints(), false));
    readonly chartArea = computed(() => this.areaPath(this.chartPoints(), true));

    readonly chartLabels = computed(() => {
        const series = this.revenueSeries();
        if (series.length >= 7) {
            return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        }
        if (series.length >= 4) {
            const picks = [
                0,
                Math.floor(series.length / 3),
                Math.floor((series.length * 2) / 3),
                series.length - 1,
            ];
            return picks.map((i) => this.shortDate(series[i]?.date));
        }
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    });

    setReportPeriod(period: ReportPeriod): void {
        this.reportPeriod.set(period);
    }

    openOrder(id: string): void {
        ignorePromise(this.router.navigate(['/dashboard/orders', id]));
    }

    openProduct(id: string): void {
        ignorePromise(this.router.navigate(['/dashboard/products', id]));
    }

    statusVariant(status: string): BadgeVariant {
        switch (status) {
            case 'DELIVERED':
            case 'COMPLETED':
            case 'CONFIRMED':
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

    productStatusVariant(label: string): BadgeVariant {
        switch (label) {
            case 'Stock':
                return 'success';
            case 'Out of stock':
                return 'destructive';
            default:
                return 'secondary';
        }
    }

    private dateRange(period: ReportPeriod): { from: string; to: string } {
        const to = new Date();
        const from = new Date(to);
        from.setDate(from.getDate() - 7);
        if (period === 'last') {
            to.setTime(from.getTime());
            from.setDate(from.getDate() - 7);
        }
        return {
            from: from.toISOString().slice(0, 10),
            to: to.toISOString().slice(0, 10),
        };
    }

    private num(value: number | string | null | undefined): number {
        if (value == null) return 0;
        const n = typeof value === 'string' ? Number(value) : value;
        return Number.isNaN(n) ? 0 : n;
    }

    private trendPct(current: number, previous: number): string {
        if (previous <= 0) return current > 0 ? '100%' : '0%';
        const pct = Math.abs(((current - previous) / previous) * 100);
        return `${pct.toFixed(1)}%`;
    }

    private orderStatusLabel(status: string): string {
        switch (status) {
            case 'DELIVERED':
            case 'COMPLETED':
            case 'CONFIRMED':
                return 'Paid';
            case 'CANCELLED':
                return 'Canceled';
            default:
                return 'Pending';
        }
    }

    private productStatusLabel(status: string | undefined): string {
        switch (status) {
            case 'PUBLISHED':
                return 'Stock';
            case 'ARCHIVED':
                return 'Out of stock';
            default:
                return 'Draft';
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

    private formatCompactMoney(value: number): string {
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(0)}K`;
        }
        return this.formatMoney(value);
    }

    private formatWhen(value: string | undefined): string {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return new Intl.DateTimeFormat(undefined, {
            day: '2-digit',
            month: 'short',
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

/**
 * Sales Cloud workspace — quotes, forecasting, lead scoring, calendar
 */

import { Component, computed, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, CalendarService, ForecastService, LeadScoringService, QuoteService } from '@services/index';
import { ButtonComponent } from '@shared/components/button.component';
import {
    CardBodyComponent,
    CardComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
} from '@shared/components/card.component';
import { IconComponent } from '@shared/components/icon.component';
import {
    ModuleWorkspaceShellComponent,
    type WorkspaceKpi,
    type WorkspaceNavItem,
} from '@shared/components/module-workspace-shell.component';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';

import { formatEnterpriseCurrency } from '../enterprise/enterprise-list.util';

const SALES_NAV: WorkspaceNavItem[] = [
    { label: 'Overview', route: '/dashboard/sales', icon: 'layout-dashboard' },
    { label: 'Quotes', route: '/dashboard/quotes', icon: 'circle-dollar-sign' },
    { label: 'Forecasting', route: '/dashboard/forecasting', icon: 'activity' },
    { label: 'Lead scoring', route: '/dashboard/lead-scoring', icon: 'tag' },
    { label: 'Calendar', route: '/dashboard/calendar', icon: 'calendar' },
];

@Component({
    selector: 'app-sales-workspace',
    imports: [
        RouterLink,
        ModuleWorkspaceShellComponent,
        CardComponent,
        CardHeaderComponent,
        CardTitleComponent,
        CardDescriptionComponent,
        CardBodyComponent,
        ButtonComponent,
        IconComponent,
    ],
    template: `
        <app-module-workspace-shell
            eyebrow="Sales Cloud"
            title="Sales"
            description="Pipeline, quotes, forecasting, and meetings in one workspace"
            [kpis]="kpis()"
            [navItems]="navItems"
        >
            <div workspaceActions>
                <app-button size="sm" routerLink="/dashboard/deals/board">
                    <app-icon name="briefcase" [size]="14" />
                    Open pipeline
                </app-button>
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
                <app-card>
                    <app-card-header>
                        <app-card-title>Revenue tools</app-card-title>
                        <app-card-description>Close deals faster with CPQ and forecasts</app-card-description>
                    </app-card-header>
                    <app-card-body class="space-y-2">
                        <a routerLink="/dashboard/quotes" class="workspace-link-row">
                            <app-icon name="circle-dollar-sign" [size]="16" />
                            <span>Create and send quotes</span>
                            <app-icon name="chevron-right" [size]="14" className="ml-auto opacity-60" />
                        </a>
                        <a routerLink="/dashboard/forecasting" class="workspace-link-row">
                            <app-icon name="activity" [size]="16" />
                            <span>Track quota vs closed revenue</span>
                            <app-icon name="chevron-right" [size]="14" className="ml-auto opacity-60" />
                        </a>
                    </app-card-body>
                </app-card>

                <app-card>
                    <app-card-header>
                        <app-card-title>Productivity</app-card-title>
                        <app-card-description>Prioritize leads and schedule follow-ups</app-card-description>
                    </app-card-header>
                    <app-card-body class="space-y-2">
                        <a routerLink="/dashboard/lead-scoring" class="workspace-link-row">
                            <app-icon name="tag" [size]="16" />
                            <span>Automated lead scoring rules</span>
                            <app-icon name="chevron-right" [size]="14" className="ml-auto opacity-60" />
                        </a>
                        <a routerLink="/dashboard/calendar" class="workspace-link-row">
                            <app-icon name="calendar" [size]="16" />
                            <span>Calendar and tasks</span>
                            <app-icon name="chevron-right" [size]="14" className="ml-auto opacity-60" />
                        </a>
                    </app-card-body>
                </app-card>
            </div>
        </app-module-workspace-shell>
    `,
    styles: `
        .workspace-link-row {
            @apply flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm font-medium
                text-foreground no-underline transition-colors hover:bg-muted/60;
        }
    `,
})
export class SalesWorkspaceComponent {
    private readonly authService = inject(AuthService);
    private readonly quoteService = inject(QuoteService);
    private readonly forecastService = inject(ForecastService);
    private readonly leadScoringService = inject(LeadScoringService);
    private readonly calendarService = inject(CalendarService);

    readonly navItems = SALES_NAV;

    readonly summaryResource = resource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        loader: async ({ abortSignal }) =>
            runResourceLoader(
                async () => {
                    throwIfAborted(abortSignal);
                    const [quotes, forecasts, rules, events] = await Promise.all([
                        this.quoteService.list({ pageSize: 100 }),
                        this.forecastService.list({ pageSize: 100 }),
                        this.leadScoringService.list({ pageSize: 100 }),
                        this.calendarService.list({ pageSize: 100 }),
                    ]);
                    const quoteTotal = quotes.data.reduce((sum, q) => sum + q.total, 0);
                    const quotaTotal = forecasts.data.reduce((sum, f) => sum + f.quota, 0);
                    const closedTotal = forecasts.data.reduce((sum, f) => sum + f.closedAmount, 0);
                    const activeRules = rules.data.filter((r) => r.active).length;
                    const upcoming = events.data.filter((e) => new Date(e.startsAt) >= new Date()).length;
                    return { quoteTotal, quotaTotal, closedTotal, activeRules, upcoming, quoteCount: quotes.total };
                },
                {
                    fallback: {
                        quoteTotal: 0,
                        quotaTotal: 0,
                        closedTotal: 0,
                        activeRules: 0,
                        upcoming: 0,
                        quoteCount: 0,
                    },
                    logMessage: 'Failed to load sales workspace:',
                },
            ),
    });

    readonly kpis = computed((): WorkspaceKpi[] => {
        const data = this.summaryResource.value();
        if (!data) return [];
        return [
            {
                label: 'Open quotes',
                value: String(data.quoteCount),
                detail: formatEnterpriseCurrency(data.quoteTotal),
                icon: 'circle-dollar-sign',
                route: '/dashboard/quotes',
            },
            {
                label: 'Quota attainment',
                value:
                    data.quotaTotal > 0
                        ? `${Math.round((data.closedTotal / data.quotaTotal) * 100)}%`
                        : '—',
                detail: `${formatEnterpriseCurrency(data.closedTotal)} closed`,
                icon: 'activity',
                route: '/dashboard/forecasting',
            },
            {
                label: 'Scoring rules',
                value: String(data.activeRules),
                detail: 'Active automation',
                icon: 'tag',
                route: '/dashboard/lead-scoring',
            },
            {
                label: 'Upcoming events',
                value: String(data.upcoming),
                detail: 'Meetings and tasks',
                icon: 'calendar',
                route: '/dashboard/calendar',
            },
        ];
    });
}

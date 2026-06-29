/**
 * Analytics workspace — reports and dashboard layouts
 */

import { Component, computed, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, ReportService } from '@services/index';
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

const ANALYTICS_NAV: WorkspaceNavItem[] = [
    { label: 'Overview', route: '/dashboard/analytics', icon: 'layout-dashboard' },
    { label: 'Reports', route: '/dashboard/reports', icon: 'layout-dashboard' },
    { label: 'Dashboards', route: '/dashboard/report-layouts', icon: 'panel-left' },
];

@Component({
    selector: 'app-analytics-workspace',
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
            eyebrow="Analytics"
            title="Insights"
            description="Custom reports, dashboards, and exportable analytics"
            [kpis]="kpis()"
            [navItems]="navItems"
        >
            <div workspaceActions>
                <app-button size="sm" routerLink="/dashboard/reports">
                    <app-icon name="plus" [size]="14" />
                    New report
                </app-button>
            </div>

            <div class="analytics-preview-grid">
                <app-card class="analytics-chart-card">
                    <app-card-header>
                        <app-card-title>Pipeline snapshot</app-card-title>
                        <app-card-description>Weighted open opportunities</app-card-description>
                    </app-card-header>
                    <app-card-body>
                        <div class="analytics-bars">
                            @for (bar of pipelineBars(); track bar.label) {
                                <div class="analytics-bar-row">
                                    <span class="analytics-bar-label">{{ bar.label }}</span>
                                    <div class="analytics-bar-track">
                                        <div class="analytics-bar-fill" [style.width.%]="bar.percent"></div>
                                    </div>
                                    <span class="analytics-bar-value">{{ bar.value }}</span>
                                </div>
                            }
                        </div>
                    </app-card-body>
                </app-card>

                <app-card>
                    <app-card-header>
                        <app-card-title>Reporting tools</app-card-title>
                        <app-card-description>Build and schedule insights</app-card-description>
                    </app-card-header>
                    <app-card-body class="space-y-2">
                        <a routerLink="/dashboard/reports" class="analytics-link">
                            <app-icon name="layout-dashboard" [size]="16" />
                            Report builder
                        </a>
                        <a routerLink="/dashboard/report-layouts" class="analytics-link">
                            <app-icon name="panel-left" [size]="16" />
                            Custom dashboards
                        </a>
                    </app-card-body>
                </app-card>
            </div>
        </app-module-workspace-shell>
    `,
    styles: `
        .analytics-preview-grid {
            @apply grid gap-4 lg:grid-cols-3;
        }

        .analytics-chart-card {
            @apply lg:col-span-2;
        }

        .analytics-bars {
            @apply space-y-3;
        }

        .analytics-bar-row {
            @apply grid grid-cols-[5rem_1fr_2rem] items-center gap-3;
        }

        .analytics-bar-label {
            @apply text-xs text-muted-foreground;
        }

        .analytics-bar-track {
            @apply h-2 overflow-hidden rounded-full bg-muted;
        }

        .analytics-bar-fill {
            @apply h-full rounded-full bg-primary;
        }

        .analytics-bar-value {
            @apply text-right text-xs font-medium tabular-nums;
        }

        .analytics-link {
            @apply flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium no-underline
                hover:bg-muted/60;
        }
    `,
})
export class AnalyticsWorkspaceComponent {
    private readonly authService = inject(AuthService);
    private readonly reportService = inject(ReportService);

    readonly navItems = ANALYTICS_NAV;

    readonly summaryResource = resource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        loader: async ({ abortSignal }) =>
            runResourceLoader(
                async () => {
                    throwIfAborted(abortSignal);
                    const [reports, layouts] = await Promise.all([
                        this.reportService.listReports({ pageSize: 100 }),
                        this.reportService.listLayouts({ pageSize: 100 }),
                    ]);
                    return { reports: reports.total, layouts: layouts.total };
                },
                { fallback: { reports: 0, layouts: 0 }, logMessage: 'Failed to load analytics:' },
            ),
    });

    readonly kpis = computed((): WorkspaceKpi[] => {
        const data = this.summaryResource.value();
        if (!data) return [];
        return [
            {
                label: 'Reports',
                value: String(data.reports),
                detail: 'Saved definitions',
                icon: 'layout-dashboard',
                route: '/dashboard/reports',
            },
            {
                label: 'Dashboards',
                value: String(data.layouts),
                detail: 'Custom layouts',
                icon: 'panel-left',
                route: '/dashboard/report-layouts',
            },
        ];
    });

    readonly pipelineBars = computed(() => {
        const data = this.summaryResource.value();
        const base = data?.reports ?? 0;
        return [
            { label: 'Leads', value: base + 12, percent: 72 },
            { label: 'Qualified', value: base + 8, percent: 58 },
            { label: 'Proposal', value: base + 5, percent: 42 },
            { label: 'Won', value: base + 2, percent: 28 },
        ];
    });
}

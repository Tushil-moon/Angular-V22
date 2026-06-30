/**
 * App launcher — SaaS-style catalog of all cloud modules
 */

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/components';
import type { IconName } from '@shared/icons';

interface AppTile {
    name: string;
    description: string;
    route: string;
    icon: IconName;
    accent: string;
    group: string;
}

const APP_TILES: AppTile[] = [
    {
        name: 'Sales Cloud',
        description: 'Quotes, forecasting, lead scoring, and calendar',
        route: '/dashboard/sales',
        icon: 'circle-dollar-sign',
        accent: 'from-violet-500/20 to-indigo-500/10',
        group: 'Revenue',
    },
    {
        name: 'Marketing Cloud',
        description: 'Campaigns, nurture programs, and engagement',
        route: '/dashboard/marketing',
        icon: 'bookmark',
        accent: 'from-pink-500/20 to-rose-500/10',
        group: 'Revenue',
    },
    {
        name: 'Service Cloud',
        description: 'Case board, queues, and knowledge base',
        route: '/dashboard/service',
        icon: 'alert-circle',
        accent: 'from-sky-500/20 to-cyan-500/10',
        group: 'Customer',
    },
    {
        name: 'Analytics',
        description: 'Reports, dashboards, and pipeline insights',
        route: '/dashboard/analytics',
        icon: 'layout-dashboard',
        accent: 'from-emerald-500/20 to-teal-500/10',
        group: 'Insights',
    },
    {
        name: 'Automation',
        description: 'Workflows, webhooks, and platform events',
        route: '/dashboard/automation',
        icon: 'activity',
        accent: 'from-amber-500/20 to-orange-500/10',
        group: 'Platform',
    },
    {
        name: 'Contacts',
        description: 'Leads, prospects, and customers',
        route: '/dashboard/contacts',
        icon: 'contact-round',
        accent: 'from-slate-500/20 to-zinc-500/10',
        group: 'CRM',
    },
    {
        name: 'Deal board',
        description: 'Visual pipeline by stage',
        route: '/dashboard/deals/board',
        icon: 'briefcase',
        accent: 'from-blue-500/20 to-indigo-500/10',
        group: 'CRM',
    },
    {
        name: 'API keys',
        description: 'Integrations and programmatic access',
        route: '/dashboard/api-keys',
        icon: 'user',
        accent: 'from-neutral-500/20 to-stone-500/10',
        group: 'Platform',
    },
];

const APP_GROUPS = ['Revenue', 'Customer', 'CRM', 'Insights', 'Platform'] as const;

@Component({
    selector: 'app-enterprise-hub',
    imports: [RouterLink, IconComponent],
    template: `
        <div class="page-shell app-launcher">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">App launcher</h1>
                    <p class="page-description">
                        Pick a cloud app to open its workspace — each includes KPIs, workflows, and
                        tools beyond simple lists.
                    </p>
                </div>
            </div>

            @for (group of groups; track group) {
                <section class="app-launcher-section">
                    <h2 class="app-launcher-group-title">{{ group }}</h2>
                    <div class="app-launcher-grid">
                        @for (app of appsForGroup(group); track app.route) {
                            <a [routerLink]="app.route" class="app-tile">
                                <div class="app-tile-icon" [class]="'bg-gradient-to-br ' + app.accent">
                                    <app-icon [name]="app.icon" [size]="22" />
                                </div>
                                <div class="app-tile-body">
                                    <p class="app-tile-name">{{ app.name }}</p>
                                    <p class="app-tile-description">{{ app.description }}</p>
                                </div>
                                <app-icon
                                    name="chevron-right"
                                    [size]="16"
                                    className="app-tile-arrow text-muted-foreground"
                                />
                            </a>
                        }
                    </div>
                </section>
            }
        </div>
    `,
    styles: `
        .app-launcher-section {
            @apply mb-8;
        }

        .app-launcher-group-title {
            @apply mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground;
        }

        .app-launcher-grid {
            @apply grid gap-3 sm:grid-cols-2 xl:grid-cols-3;
        }

        .app-tile {
            @apply flex items-start gap-4 rounded-xl border border-border bg-card p-4 no-underline shadow-sm
                transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md;
        }

        .app-tile-icon {
            @apply flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-foreground;
        }

        .app-tile-body {
            @apply min-w-0 flex-1;
        }

        .app-tile-name {
            @apply font-semibold text-foreground;
        }

        .app-tile-description {
            @apply mt-1 text-sm text-muted-foreground;
        }

        .app-tile-arrow {
            @apply mt-1 shrink-0;
        }
    `,
})
export class EnterpriseHubComponent {
    readonly groups = APP_GROUPS;

    appsForGroup(group: (typeof APP_GROUPS)[number]): AppTile[] {
        return APP_TILES.filter((app) => app.group === group);
    }
}

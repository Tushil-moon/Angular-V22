/**
 * Marketing Cloud workspace
 */

import { Component, computed, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, CampaignService } from '@services/index';
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

const MARKETING_NAV: WorkspaceNavItem[] = [
    { label: 'Overview', route: '/dashboard/marketing', icon: 'layout-dashboard' },
    { label: 'Campaigns', route: '/dashboard/campaigns', icon: 'bookmark' },
];

@Component({
    selector: 'app-marketing-workspace',
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
            eyebrow="Marketing Cloud"
            title="Marketing"
            description="Launch campaigns, nurture leads, and measure engagement"
            [kpis]="kpis()"
            [navItems]="navItems"
        >
            <div workspaceActions>
                <app-button size="sm" routerLink="/dashboard/campaigns">
                    <app-icon name="plus" [size]="14" />
                    New campaign
                </app-button>
            </div>

            <app-card>
                <app-card-header>
                    <app-card-title>Campaign hub</app-card-title>
                    <app-card-description>
                        Email, event, and nurture programs with budget tracking
                    </app-card-description>
                </app-card-header>
                <app-card-body>
                    <a routerLink="/dashboard/campaigns" class="workspace-hero-link">
                        <div class="workspace-hero-icon">
                            <app-icon name="bookmark" [size]="24" />
                        </div>
                        <div>
                            <p class="font-semibold">Manage campaigns</p>
                            <p class="text-sm text-muted-foreground">
                                View performance, status, and budgets in card view
                            </p>
                        </div>
                        <app-icon name="chevron-right" [size]="18" className="ml-auto" />
                    </a>
                </app-card-body>
            </app-card>
        </app-module-workspace-shell>
    `,
    styles: `
        .workspace-hero-link {
            @apply flex items-center gap-4 rounded-xl border border-border p-4 no-underline transition-colors
                hover:border-primary/40 hover:bg-muted/30;
        }

        .workspace-hero-icon {
            @apply flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary;
        }
    `,
})
export class MarketingWorkspaceComponent {
    private readonly authService = inject(AuthService);
    private readonly campaignService = inject(CampaignService);

    readonly navItems = MARKETING_NAV;

    readonly summaryResource = resource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        loader: async ({ abortSignal }) =>
            runResourceLoader(
                async () => {
                    throwIfAborted(abortSignal);
                    const campaigns = await this.campaignService.list({ pageSize: 100 });
                    const active = campaigns.data.filter((c) => c.status === 'ACTIVE').length;
                    const budget = campaigns.data.reduce((sum, c) => sum + (c.budget ?? 0), 0);
                    return { total: campaigns.total, active, budget };
                },
                { fallback: { total: 0, active: 0, budget: 0 }, logMessage: 'Failed to load marketing:' },
            ),
    });

    readonly kpis = computed((): WorkspaceKpi[] => {
        const data = this.summaryResource.value();
        if (!data) return [];
        return [
            {
                label: 'Campaigns',
                value: String(data.total),
                detail: 'All programs',
                icon: 'bookmark',
                route: '/dashboard/campaigns',
            },
            {
                label: 'Active',
                value: String(data.active),
                detail: 'Running now',
                icon: 'activity',
                route: '/dashboard/campaigns',
            },
            {
                label: 'Total budget',
                value: formatEnterpriseCurrency(data.budget),
                detail: 'Allocated spend',
                icon: 'circle-dollar-sign',
                route: '/dashboard/campaigns',
            },
        ];
    });
}

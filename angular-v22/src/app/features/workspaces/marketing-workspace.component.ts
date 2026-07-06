/**
 * Marketing Cloud workspace
 */

import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core'
import { RouterLink } from '@angular/router';
import { AuthService, CampaignService, EmailSequenceService, EmailTemplateService } from '@services/index';
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

const MARKETING_NAV: WorkspaceNavItem[] = [
    { label: 'Overview', route: '/dashboard/marketing', icon: 'layout-dashboard' },
    { label: 'Campaigns', route: '/dashboard/campaigns', icon: 'bookmark' },
    { label: 'Email templates', route: '/dashboard/email-templates', icon: 'link' },
    { label: 'Sequences', route: '/dashboard/email-sequences', icon: 'list-ordered' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
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
    private readonly emailTemplateService = inject(EmailTemplateService);
    private readonly emailSequenceService = inject(EmailSequenceService);

    readonly navItems = MARKETING_NAV;

    readonly summaryResource = resource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        loader: async ({ abortSignal }) =>
            runResourceLoader(
                async () => {
                    throwIfAborted(abortSignal);
                    const [campaigns, templates, sequences] = await Promise.all([
                        this.campaignService.list({ pageSize: 100 }),
                        this.emailTemplateService.list({ pageSize: 1 }),
                        this.emailSequenceService.list({ pageSize: 1 }),
                    ]);
                    const active = campaigns.data.filter((c) => c.status === 'ACTIVE').length;
                    const sent = campaigns.data.reduce((sum, c) => sum + (c.sentCount ?? 0), 0);
                    return {
                        total: campaigns.total,
                        active,
                        sent,
                        templates: templates.total,
                        sequences: sequences.total,
                    };
                },
                {
                    fallback: { total: 0, active: 0, sent: 0, templates: 0, sequences: 0 },
                    logMessage: 'Failed to load marketing:',
                },
            ),
    });

    readonly kpis = computed((): WorkspaceKpi[] => {
        const data = this.summaryResource.value();
        if (!data) return [];
        return [
            {
                label: 'Campaigns',
                value: String(data.total),
                detail: `${data.active} active`,
                icon: 'bookmark',
                route: '/dashboard/campaigns',
            },
            {
                label: 'Emails sent',
                value: String(data.sent),
                detail: 'Across all programs',
                icon: 'activity',
                route: '/dashboard/campaigns',
            },
            {
                label: 'Templates',
                value: String(data.templates),
                detail: 'Reusable content',
                icon: 'link',
                route: '/dashboard/email-templates',
            },
            {
                label: 'Sequences',
                value: String(data.sequences),
                detail: 'Nurture flows',
                icon: 'list-ordered',
                route: '/dashboard/email-sequences',
            },
        ];
    });
}

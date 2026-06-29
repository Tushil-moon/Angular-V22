/**
 * Automation workspace — workflows and webhooks
 */

import { Component, computed, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, WebhookService, WorkflowService } from '@services/index';
import { ButtonComponent } from '@shared/components/button.component';
import { IconComponent } from '@shared/components/icon.component';
import {
    ModuleWorkspaceShellComponent,
    type WorkspaceKpi,
    type WorkspaceNavItem,
} from '@shared/components/module-workspace-shell.component';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';

const AUTOMATION_NAV: WorkspaceNavItem[] = [
    { label: 'Overview', route: '/dashboard/automation', icon: 'layout-dashboard' },
    { label: 'Workflows', route: '/dashboard/workflows', icon: 'activity' },
    { label: 'Webhooks', route: '/dashboard/webhooks', icon: 'settings' },
];

@Component({
    selector: 'app-automation-workspace',
    imports: [RouterLink, ModuleWorkspaceShellComponent, ButtonComponent, IconComponent],
    template: `
        <app-module-workspace-shell
            eyebrow="Automation"
            title="Platform automation"
            description="Trigger workflows and deliver events to external systems"
            [kpis]="kpis()"
            [navItems]="navItems"
        >
            <div workspaceActions>
                <app-button size="sm" routerLink="/dashboard/workflows">
                    <app-icon name="plus" [size]="14" />
                    New workflow
                </app-button>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
                <a routerLink="/dashboard/workflows" class="automation-tile">
                    <app-icon name="activity" [size]="22" />
                    <div>
                        <p class="font-semibold">Workflows</p>
                        <p class="text-sm text-muted-foreground">
                            Record triggers → assign, email, update field
                        </p>
                    </div>
                </a>
                <a routerLink="/dashboard/webhooks" class="automation-tile">
                    <app-icon name="settings" [size]="22" />
                    <div>
                        <p class="font-semibold">Webhooks</p>
                        <p class="text-sm text-muted-foreground">
                            Outbound event delivery with retry
                        </p>
                    </div>
                </a>
            </div>
        </app-module-workspace-shell>
    `,
    styles: `
        .automation-tile {
            @apply flex items-start gap-3 rounded-xl border border-border bg-card p-5 no-underline shadow-sm
                transition-all hover:border-primary/40 hover:shadow-md;
        }
    `,
})
export class AutomationWorkspaceComponent {
    private readonly authService = inject(AuthService);
    private readonly workflowService = inject(WorkflowService);
    private readonly webhookService = inject(WebhookService);

    readonly navItems = AUTOMATION_NAV;

    readonly summaryResource = resource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        loader: async ({ abortSignal }) =>
            runResourceLoader(
                async () => {
                    throwIfAborted(abortSignal);
                    const [workflows, webhooks] = await Promise.all([
                        this.workflowService.list({ pageSize: 100 }),
                        this.webhookService.list({ pageSize: 100 }),
                    ]);
                    const activeWorkflows = workflows.data.filter((w) => w.active).length;
                    const activeWebhooks = webhooks.data.filter((w) => w.active).length;
                    return {
                        workflows: workflows.total,
                        webhooks: webhooks.total,
                        activeWorkflows,
                        activeWebhooks,
                    };
                },
                {
                    fallback: { workflows: 0, webhooks: 0, activeWorkflows: 0, activeWebhooks: 0 },
                    logMessage: 'Failed to load automation:',
                },
            ),
    });

    readonly kpis = computed((): WorkspaceKpi[] => {
        const data = this.summaryResource.value();
        if (!data) return [];
        return [
            {
                label: 'Workflows',
                value: String(data.activeWorkflows),
                detail: `${data.workflows} total`,
                icon: 'activity',
                route: '/dashboard/workflows',
            },
            {
                label: 'Webhooks',
                value: String(data.activeWebhooks),
                detail: `${data.webhooks} endpoints`,
                icon: 'settings',
                route: '/dashboard/webhooks',
            },
        ];
    });
}

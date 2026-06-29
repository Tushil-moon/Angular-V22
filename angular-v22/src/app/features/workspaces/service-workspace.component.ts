/**
 * Service Cloud workspace — cases and knowledge base
 */

import { Component, computed, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, CaseService, KnowledgeService } from '@services/index';
import { ButtonComponent } from '@shared/components/button.component';
import { IconComponent } from '@shared/components/icon.component';
import {
    ModuleWorkspaceShellComponent,
    type WorkspaceKpi,
    type WorkspaceNavItem,
} from '@shared/components/module-workspace-shell.component';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';

const SERVICE_NAV: WorkspaceNavItem[] = [
    { label: 'Overview', route: '/dashboard/service', icon: 'layout-dashboard' },
    { label: 'Case board', route: '/dashboard/cases', icon: 'alert-circle' },
    { label: 'Knowledge', route: '/dashboard/knowledge', icon: 'list' },
];

@Component({
    selector: 'app-service-workspace',
    imports: [RouterLink, ModuleWorkspaceShellComponent, ButtonComponent, IconComponent],
    template: `
        <app-module-workspace-shell
            eyebrow="Service Cloud"
            title="Service"
            description="Support cases, agent queues, and self-service knowledge"
            [kpis]="kpis()"
            [navItems]="navItems"
        >
            <div workspaceActions>
                <app-button size="sm" routerLink="/dashboard/cases">
                    <app-icon name="plus" [size]="14" />
                    New case
                </app-button>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
                <a routerLink="/dashboard/cases" class="service-tile">
                    <app-icon name="alert-circle" [size]="22" />
                    <div>
                        <p class="font-semibold">Case board</p>
                        <p class="text-sm text-muted-foreground">Kanban by status and priority</p>
                    </div>
                </a>
                <a routerLink="/dashboard/knowledge" class="service-tile">
                    <app-icon name="list" [size]="22" />
                    <div>
                        <p class="font-semibold">Knowledge base</p>
                        <p class="text-sm text-muted-foreground">Published help articles</p>
                    </div>
                </a>
            </div>
        </app-module-workspace-shell>
    `,
    styles: `
        .service-tile {
            @apply flex items-start gap-3 rounded-xl border border-border bg-card p-5 no-underline shadow-sm
                transition-all hover:border-primary/40 hover:shadow-md;
        }
    `,
})
export class ServiceWorkspaceComponent {
    private readonly authService = inject(AuthService);
    private readonly caseService = inject(CaseService);
    private readonly knowledgeService = inject(KnowledgeService);

    readonly navItems = SERVICE_NAV;

    readonly summaryResource = resource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        loader: async ({ abortSignal }) =>
            runResourceLoader(
                async () => {
                    throwIfAborted(abortSignal);
                    const [cases, articles] = await Promise.all([
                        this.caseService.list({ pageSize: 100 }),
                        this.knowledgeService.list({ pageSize: 100 }),
                    ]);
                    const open = cases.data.filter(
                        (c) => !['RESOLVED', 'CLOSED'].includes(c.status.toUpperCase()),
                    ).length;
                    const urgent = cases.data.filter((c) =>
                        ['HIGH', 'URGENT'].includes(c.priority.toUpperCase()),
                    ).length;
                    const published = articles.data.filter((a) => a.published).length;
                    return { open, urgent, published, totalCases: cases.total };
                },
                {
                    fallback: { open: 0, urgent: 0, published: 0, totalCases: 0 },
                    logMessage: 'Failed to load service workspace:',
                },
            ),
    });

    readonly kpis = computed((): WorkspaceKpi[] => {
        const data = this.summaryResource.value();
        if (!data) return [];
        return [
            {
                label: 'Open cases',
                value: String(data.open),
                detail: `${data.totalCases} total`,
                icon: 'alert-circle',
                route: '/dashboard/cases',
            },
            {
                label: 'Urgent',
                value: String(data.urgent),
                detail: 'Needs attention',
                icon: 'activity',
                route: '/dashboard/cases',
            },
            {
                label: 'Articles',
                value: String(data.published),
                detail: 'Published in KB',
                icon: 'list',
                route: '/dashboard/knowledge',
            },
        ];
    });
}

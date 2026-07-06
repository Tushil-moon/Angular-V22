/**
 * Cases — support desk kanban board
 */

import { ChangeDetectionStrategy, Component, computed, inject, resource, ViewEncapsulation } from '@angular/core';
import { AuthService, CaseService, DialogService } from '@services/index';
import { BadgeComponent } from '@shared/components/badge.component';
import { ButtonComponent } from '@shared/components/button.component';
import { IconComponent } from '@shared/components/icon.component';
import {
    ModuleWorkspaceShellComponent,
    type WorkspaceKpi,
} from '@shared/components/module-workspace-shell.component';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';

import { formatEnterpriseDate } from '../enterprise/enterprise-list.util';
import {
    enterprisePriorityBadge,
    enterpriseStatusBadge,
    formatEnterpriseStatus,
} from '../enterprise/enterprise-ui.util';
import { SERVICE_NAV } from '../workspaces/service-nav';

const CASE_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-cases-list',
    imports: [
        ModuleWorkspaceShellComponent,
        ButtonComponent,
        IconComponent,
        BadgeComponent,
    ],
    template: `
        <app-module-workspace-shell
            eyebrow="Service Cloud"
            title="Case board"
            description="Triage and resolve customer issues by status"
            [kpis]="kpis()"
            [navItems]="navItems"
        >
            <div workspaceActions>
                <app-button size="sm" (clicked)="openCaseDialog()">
                    <app-icon name="plus" [size]="14" />
                    New case
                </app-button>
            </div>

            @if (loadError()) {
                <p class="text-sm text-destructive">{{ loadError() }}</p>
            }

            <div class="kanban-board cases-board">
                @for (column of columns(); track column.status) {
                    <div class="kanban-column">
                        <div class="kanban-column-header">
                            <app-badge [variant]="enterpriseStatusBadge(column.status)">
                                {{ formatEnterpriseStatus(column.status) }}
                            </app-badge>
                            <span class="text-xs text-muted-foreground">{{ column.cases.length }}</span>
                        </div>
                        <div class="kanban-column-body">
                            @for (caseItem of column.cases; track caseItem.id) {
                                <button
                                    type="button"
                                    class="kanban-card text-left"
                                    (click)="openCaseDialog(caseItem.id)"
                                >
                                    <p class="kanban-card-meta">{{ caseItem.caseNumber ?? 'Case' }}</p>
                                    <p class="kanban-card-title">{{ caseItem.subject }}</p>
                                    <div class="mt-2 flex flex-wrap gap-1">
                                        <app-badge [variant]="enterprisePriorityBadge(caseItem.priority)">
                                            {{ formatEnterpriseStatus(caseItem.priority) }}
                                        </app-badge>
                                        @if (caseItem.slaBreached) {
                                            <app-badge variant="destructive">SLA</app-badge>
                                        }
                                    </div>
                                    <p class="kanban-card-meta">
                                        {{ formatEnterpriseDate(caseItem.createdAt) }}
                                    </p>
                                </button>
                            }
                        </div>
                    </div>
                }
            </div>
        </app-module-workspace-shell>
    `,
    styleUrl: './cases-board.component.scss',
    encapsulation: ViewEncapsulation.None,
})
export class CasesListComponent {
    private readonly caseService = inject(CaseService);
    private readonly authService = inject(AuthService);
    private readonly dialogService = inject(DialogService);

    readonly navItems = SERVICE_NAV;
    readonly enterpriseStatusBadge = enterpriseStatusBadge;
    readonly enterprisePriorityBadge = enterprisePriorityBadge;
    readonly formatEnterpriseStatus = formatEnterpriseStatus;
    readonly formatEnterpriseDate = formatEnterpriseDate;

    readonly casesResource = resource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        loader: async ({ abortSignal }) =>
            runResourceLoader(
                async () => {
                    throwIfAborted(abortSignal);
                    const result = await this.caseService.list({ pageSize: 100 });
                    return result.data;
                },
                { fallback: [], logMessage: 'Failed to load cases:' },
            ),
    });

    readonly loadError = computed(() => this.casesResource.error()?.message ?? null);

    readonly kpis = computed((): WorkspaceKpi[] => {
        const cases = this.casesResource.value() ?? [];
        const open = cases.filter((c) => !['RESOLVED', 'CLOSED'].includes(c.status.toUpperCase())).length;
        const urgent = cases.filter((c) =>
            ['HIGH', 'URGENT'].includes(c.priority.toUpperCase()),
        ).length;
        return [
            {
                label: 'Open cases',
                value: String(open),
                detail: `${cases.length} on board`,
                icon: 'alert-circle',
            },
            {
                label: 'Urgent',
                value: String(urgent),
                detail: 'Needs attention',
                icon: 'activity',
            },
            {
                label: 'Resolved',
                value: String(cases.filter((c) => c.status.toUpperCase() === 'RESOLVED').length),
                detail: 'Awaiting close',
                icon: 'check',
            },
        ];
    });

    readonly columns = computed(() => {
        const cases = this.casesResource.value() ?? [];
        return CASE_STATUSES.map((status) => ({
            status,
            cases: cases.filter((c) => c.status.toUpperCase() === status),
        }));
    });

    async openCaseDialog(caseId?: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./case-detail-dialog.component').CaseDetailDialogComponent,
            import('./case-detail-dialog.component').CaseDetailDialogData,
            import('./case-detail-dialog.component').CaseDetailDialogResult
        >(
            () =>
                import('./case-detail-dialog.component').then((m) => m.CaseDetailDialogComponent),
            { data: { caseId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.casesResource.reload();
        });
    }
}

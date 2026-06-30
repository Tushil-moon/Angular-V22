/**
 * Cases — support desk kanban board
 */

import { Component, computed, inject, resource, signal, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CaseRecord } from '@models/enterprise.model';
import { AuthService, CaseService } from '@services/index';
import { ToastService } from '@services/toast.service';
import { BadgeComponent } from '@shared/components/badge.component';
import { ButtonComponent } from '@shared/components/button.component';
import { IconComponent } from '@shared/components/icon.component';
import {
    ModuleWorkspaceShellComponent,
    type WorkspaceNavItem,
} from '@shared/components/module-workspace-shell.component';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';

import { formatEnterpriseDate } from '../enterprise/enterprise-list.util';
import {
    enterprisePriorityBadge,
    enterpriseStatusBadge,
    formatEnterpriseStatus,
} from '../enterprise/enterprise-ui.util';

const CASE_STATUSES = ['NEW', 'OPEN', 'PENDING', 'RESOLVED', 'CLOSED'] as const;

const SERVICE_NAV: WorkspaceNavItem[] = [
    { label: 'Service', route: '/dashboard/service', icon: 'layout-dashboard' },
    { label: 'Case board', route: '/dashboard/cases', icon: 'alert-circle' },
    { label: 'Knowledge', route: '/dashboard/knowledge', icon: 'list' },
];

@Component({
    selector: 'app-cases-list',
    imports: [
        RouterLink,
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
            [navItems]="navItems"
        >
            <div workspaceActions>
                <app-button size="sm" [disabled]="creating()" (clicked)="createCase()">
                    <app-icon name="plus" [size]="14" />
                    New case
                </app-button>
                <app-button variant="outline" size="sm" routerLink="/dashboard/knowledge">
                    Knowledge base
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
                                    (click)="selectedCase.set(caseItem)"
                                >
                                    <p class="kanban-card-title">{{ caseItem.subject }}</p>
                                    <app-badge
                                        class="mt-2"
                                        [variant]="enterprisePriorityBadge(caseItem.priority)"
                                    >
                                        {{ formatEnterpriseStatus(caseItem.priority) }}
                                    </app-badge>
                                    <p class="kanban-card-meta">
                                        {{ formatEnterpriseDate(caseItem.createdAt) }}
                                    </p>
                                </button>
                            }
                        </div>
                    </div>
                }
            </div>

            @if (selectedCase(); as caseItem) {
                <div
                    class="case-detail-overlay"
                    role="button"
                    tabindex="0"
                    aria-label="Close case details"
                    (click)="selectedCase.set(null)"
                    (keydown.enter)="selectedCase.set(null)"
                    (keydown.escape)="selectedCase.set(null)"
                ></div>
                <aside class="case-detail-panel" role="dialog">
                    <div class="case-detail-header">
                        <h2 class="text-lg font-semibold">{{ caseItem.subject }}</h2>
                        <app-button variant="ghost" size="icon" type="button" (clicked)="selectedCase.set(null)">
                            <app-icon name="x" [size]="18" />
                        </app-button>
                    </div>
                    <dl class="case-detail-fields">
                        <div>
                            <dt>Status</dt>
                            <dd>
                                <app-badge [variant]="enterpriseStatusBadge(caseItem.status)">
                                    {{ formatEnterpriseStatus(caseItem.status) }}
                                </app-badge>
                            </dd>
                        </div>
                        <div>
                            <dt>Priority</dt>
                            <dd>
                                <app-badge [variant]="enterprisePriorityBadge(caseItem.priority)">
                                    {{ formatEnterpriseStatus(caseItem.priority) }}
                                </app-badge>
                            </dd>
                        </div>
                        <div>
                            <dt>Created</dt>
                            <dd>{{ formatEnterpriseDate(caseItem.createdAt) }}</dd>
                        </div>
                    </dl>
                    <app-button
                        variant="destructive"
                        size="sm"
                        type="button"
                        (clicked)="deleteCase(caseItem.id)"
                    >
                        Delete case
                    </app-button>
                </aside>
            }
        </app-module-workspace-shell>
    `,
    styleUrl: './cases-board.component.scss',
    encapsulation: ViewEncapsulation.None,
})
export class CasesListComponent {
    private readonly caseService = inject(CaseService);
    private readonly authService = inject(AuthService);
    private readonly toastService = inject(ToastService);

    readonly navItems = SERVICE_NAV;
    readonly enterpriseStatusBadge = enterpriseStatusBadge;
    readonly enterprisePriorityBadge = enterprisePriorityBadge;
    readonly formatEnterpriseStatus = formatEnterpriseStatus;
    readonly formatEnterpriseDate = formatEnterpriseDate;

    readonly creating = signal(false);
    readonly selectedCase = signal<CaseRecord | null>(null);

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

    readonly columns = computed(() => {
        const cases = this.casesResource.value() ?? [];
        return CASE_STATUSES.map((status) => ({
            status,
            cases: cases.filter((c) => c.status.toUpperCase() === status),
        }));
    });

    async createCase(): Promise<void> {
        this.creating.set(true);
        try {
            await this.caseService.create({
                subject: `Support request ${new Date().toLocaleDateString()}`,
                priority: 'MEDIUM',
                status: 'NEW',
            });
            this.casesResource.reload();
            this.toastService.success('Case created', 'Added to New column.');
        } catch {
            this.toastService.show({
                title: 'Create failed',
                description: 'Could not create case.',
                variant: 'destructive',
            });
        } finally {
            this.creating.set(false);
        }
    }

    async deleteCase(id: string): Promise<void> {
        try {
            await this.caseService.delete(id);
            this.selectedCase.set(null);
            this.casesResource.reload();
            this.toastService.success('Deleted', 'Case removed.');
        } catch {
            this.toastService.show({
                title: 'Delete failed',
                description: 'Could not delete case.',
                variant: 'destructive',
            });
        }
    }
}

/**
 * SaaS module workspace — KPI strip, sub-nav tabs, and content area
 */

import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import {
    CardBodyComponent,
    CardComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
} from './card.component';
import { IconComponent } from './icon.component';
import type { WorkspaceKpi, WorkspaceNavItem } from './workspace.types';

export type { WorkspaceKpi, WorkspaceNavItem } from './workspace.types';

@Component({
    selector: 'app-module-workspace-shell',
    imports: [
        RouterLink,
        RouterLinkActive,
        CardComponent,
        CardHeaderComponent,
        CardDescriptionComponent,
        CardBodyComponent,
        IconComponent,
    ],
    template: `
        <div class="page-shell workspace-shell">
            <div class="page-toolbar">
                <div class="page-header">
                    <p class="workspace-eyebrow">{{ eyebrow() }}</p>
                    <h1 class="page-title">{{ title() }}</h1>
                    <p class="page-description">{{ description() }}</p>
                </div>
                <div class="toolbar-actions">
                    <ng-content select="[workspaceActions]" />
                </div>
            </div>

            @if (kpis().length > 0) {
                <div class="workspace-kpi-grid">
                    @for (kpi of kpis(); track kpi.label) {
                        @if (kpi.route) {
                            <a [routerLink]="kpi.route" class="workspace-kpi-card workspace-kpi-link">
                                <app-card class="h-full">
                                    <app-card-header class="workspace-kpi-header">
                                        <app-card-description>{{ kpi.label }}</app-card-description>
                                        <div class="workspace-kpi-icon">
                                            <app-icon
                                                [name]="kpi.icon"
                                                [size]="16"
                                                className="text-muted-foreground"
                                            />
                                        </div>
                                    </app-card-header>
                                    <app-card-body>
                                        <p class="workspace-kpi-value">{{ kpi.value }}</p>
                                        @if (kpi.detail) {
                                            <p class="workspace-kpi-detail">{{ kpi.detail }}</p>
                                        }
                                    </app-card-body>
                                </app-card>
                            </a>
                        } @else {
                            <app-card class="workspace-kpi-card">
                                <app-card-header class="workspace-kpi-header">
                                    <app-card-description>{{ kpi.label }}</app-card-description>
                                    <div class="workspace-kpi-icon">
                                        <app-icon
                                            [name]="kpi.icon"
                                            [size]="16"
                                            className="text-muted-foreground"
                                        />
                                    </div>
                                </app-card-header>
                                <app-card-body>
                                    <p class="workspace-kpi-value">{{ kpi.value }}</p>
                                    @if (kpi.detail) {
                                        <p class="workspace-kpi-detail">{{ kpi.detail }}</p>
                                    }
                                </app-card-body>
                            </app-card>
                        }
                    }
                </div>
            }

            @if (navItems().length > 0) {
                <nav class="workspace-subnav" aria-label="Module sections">
                    @for (item of navItems(); track item.route) {
                        <a
                            [routerLink]="item.route"
                            routerLinkActive="workspace-subnav-active"
                            class="workspace-subnav-item"
                        >
                            @if (item.icon) {
                                <app-icon [name]="item.icon" [size]="14" />
                            }
                            {{ item.label }}
                        </a>
                    }
                </nav>
            }

            <div class="workspace-content">
                <ng-content />
            </div>
        </div>
    `,
    styles: `
        .workspace-shell {
            @apply min-w-0;
        }

        .workspace-eyebrow {
            @apply mb-1 text-xs font-semibold uppercase tracking-wider text-primary;
        }

        .workspace-kpi-grid {
            @apply grid gap-3 sm:grid-cols-2 xl:grid-cols-4;
        }

        .workspace-kpi-link {
            @apply block no-underline;
        }

        .workspace-kpi-card {
            @apply transition-colors hover:border-primary/30;
        }

        .workspace-kpi-header {
            @apply flex flex-row items-start justify-between gap-2 space-y-0;
        }

        .workspace-kpi-icon {
            @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted;
        }

        .workspace-kpi-value {
            @apply text-2xl font-bold tracking-tight text-foreground;
        }

        .workspace-kpi-detail {
            @apply mt-1 text-xs text-muted-foreground;
        }

        .workspace-subnav {
            @apply flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1;
        }

        .workspace-subnav-item {
            @apply inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground
                no-underline transition-colors hover:bg-background hover:text-foreground;
        }

        .workspace-subnav-active {
            @apply bg-background text-foreground shadow-sm;
        }

        .workspace-content {
            @apply min-h-0 flex-1;
        }
    `,
})
export class ModuleWorkspaceShellComponent {
    eyebrow = input('Workspace');
    title = input.required<string>();
    description = input('');
    kpis = input<WorkspaceKpi[]>([]);
    navItems = input<WorkspaceNavItem[]>([]);
}

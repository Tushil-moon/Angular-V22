/**
 * Dashboard Home Page — shadcn-style overview
 */

import { Component, computed, inject, injectAsync, onIdle, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, DashboardService, DialogService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    CardBodyComponent,
    CardComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    IconComponent,
    SkeletonComponent,
} from '@shared/components';
import {
    DropdownItemComponent,
    DropdownMenuComponent,
    DropdownSeparatorComponent,
} from '@shared/components/dropdown-menu.component';
import { mapDashboardStats, STATS_SKELETON_COUNT } from '@shared/config/dashboard.config';
import { Permissions } from '@shared/constants/permissions';
import { ignorePromise } from '@utils/form-display.util';

import { DashboardPanelsComponent } from './dashboard-panels.component';

@Component({
    selector: 'app-dashboard-home',
    imports: [
        CardComponent,
        CardHeaderComponent,
        CardDescriptionComponent,
        CardBodyComponent,
        SkeletonComponent,
        ButtonComponent,
        IconComponent,
        DashboardPanelsComponent,
        DropdownMenuComponent,
        DropdownItemComponent,
        DropdownSeparatorComponent,
    ],
    template: `
        <div class="page-shell dashboard-home">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">Welcome back, {{ displayName() }}</h1>
                    <p class="page-description">Here's what's happening in your workspace today.</p>
                </div>
                <div class="toolbar-actions">
                    <app-button size="sm" (clicked)="refreshStats()">
                        Refresh
                    </app-button>
                    <app-dropdown-menu #quickActionsMenu align="end">
                        <app-button dropdownTrigger size="sm">
                            <app-icon name="plus" [size]="14" />
                            Quick action
                            <app-icon name="chevron-down" [size]="14" className="opacity-70" />
                        </app-button>
                        <div dropdownContent>
                            @if (canManageContacts()) {
                                <app-dropdown-item (itemClick)="createContact(quickActionsMenu)">
                                    <app-icon name="contact-round" [size]="14" />
                                    New contact
                                </app-dropdown-item>
                            }
                            @if (canManageDeals()) {
                                <app-dropdown-item (itemClick)="createDeal(quickActionsMenu)">
                                    <app-icon name="briefcase" [size]="14" />
                                    New deal
                                </app-dropdown-item>
                            }
                            <app-dropdown-separator />
                            <app-dropdown-item (itemClick)="goToBoard(quickActionsMenu)">
                                <app-icon name="list" [size]="14" />
                                Open deal board
                            </app-dropdown-item>
                            <app-dropdown-item (itemClick)="goToTags(quickActionsMenu)">
                                <app-icon name="tag" [size]="14" />
                                Manage tags
                            </app-dropdown-item>
                        </div>
                    </app-dropdown-menu>
                </div>
            </div>

            <div class="dashboard-stats-grid">
                @if (!dashboardService.isLoading()) {
                    @for (stat of stats(); track stat.label) {
                        @if (stat.route) {
                            <button
                                type="button"
                                class="dashboard-stat-card dashboard-stat-card-link"
                                (click)="navigateTo(stat.route!)"
                            >
                                <app-card class="h-full">
                                    <app-card-header class="stat-card-header">
                                        <app-card-description>{{ stat.label }}</app-card-description>
                                        <div class="stat-icon">
                                            <app-icon
                                                [name]="stat.icon"
                                                [size]="16"
                                                className="text-muted-foreground"
                                            />
                                        </div>
                                    </app-card-header>
                                    <app-card-body>
                                        <div class="dashboard-stat-value">
                                            {{ stat.value }}
                                        </div>
                                        <p class="dashboard-stat-detail">{{ stat.detail }}</p>
                                    </app-card-body>
                                </app-card>
                            </button>
                        } @else {
                            <app-card class="dashboard-stat-card">
                                <app-card-header class="stat-card-header">
                                    <app-card-description>{{ stat.label }}</app-card-description>
                                    <div class="stat-icon">
                                        <app-icon
                                            [name]="stat.icon"
                                            [size]="16"
                                            className="text-muted-foreground"
                                        />
                                    </div>
                                </app-card-header>
                                <app-card-body>
                                    <div class="dashboard-stat-value">
                                        {{ stat.value }}
                                    </div>
                                    <p class="dashboard-stat-detail">{{ stat.detail }}</p>
                                </app-card-body>
                            </app-card>
                        }
                    }
                } @else {
                    @for (_ of statsSkeletonItems; track $index) {
                        <app-card class="dashboard-stat-card">
                            <app-card-header class="stat-card-header">
                                <app-skeleton className="h-3 w-20" />
                                <app-skeleton className="h-9 w-9 shrink-0 rounded-md" />
                            </app-card-header>
                            <app-card-body>
                                <div class="space-y-2">
                                    <app-skeleton className="h-8 w-16" />
                                    <app-skeleton className="h-3 w-28" />
                                </div>
                            </app-card-body>
                        </app-card>
                    }
                }
            </div>

            @defer (on viewport; prefetch on idle) {
                <app-dashboard-panels />
            } @placeholder (minimum 150ms) {
                <div class="grid gap-4 lg:grid-cols-7" aria-hidden="true">
                    <app-card class="lg:col-span-7">
                        <app-card-body>
                            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                @for (_ of statsSkeletonItems; track $index) {
                                    <app-skeleton className="h-20 w-full rounded-lg" />
                                }
                            </div>
                        </app-card-body>
                    </app-card>
                    <app-card class="lg:col-span-4">
                        <app-card-body>
                            <div class="space-y-3">
                                @for (_ of statsSkeletonItems; track $index) {
                                    <app-skeleton className="h-12 w-full" />
                                }
                            </div>
                        </app-card-body>
                    </app-card>
                    <app-card class="lg:col-span-3">
                        <app-card-body>
                            <div class="space-y-3">
                                @for (_ of statsSkeletonItems; track $index) {
                                    <app-skeleton className="h-10 w-full" />
                                }
                            </div>
                        </app-card-body>
                    </app-card>
                </div>
            } @loading (minimum 150ms) {
                <div class="grid gap-4 lg:grid-cols-7" aria-busy="true">
                    <app-card class="lg:col-span-7">
                        <app-card-body>
                            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                @for (_ of statsSkeletonItems; track $index) {
                                    <app-skeleton className="h-20 w-full rounded-lg" />
                                }
                            </div>
                        </app-card-body>
                    </app-card>
                    <app-card class="lg:col-span-4">
                        <app-card-body>
                            <div class="space-y-3">
                                @for (_ of statsSkeletonItems; track $index) {
                                    <app-skeleton className="h-12 w-full" />
                                }
                            </div>
                        </app-card-body>
                    </app-card>
                    <app-card class="lg:col-span-3">
                        <app-card-body>
                            <div class="space-y-3">
                                @for (_ of statsSkeletonItems; track $index) {
                                    <app-skeleton className="h-10 w-full" />
                                }
                            </div>
                        </app-card-body>
                    </app-card>
                </div>
            }
        </div>
    `,
    styleUrl: './home.component.scss',
    encapsulation: ViewEncapsulation.None,
})
export class DashboardHomeComponent implements OnInit {
    authService = inject(AuthService);
    dashboardService = inject(DashboardService);
    toastService = inject(ToastService);
    private readonly router = inject(Router);
    private readonly dialogService = inject(DialogService);
    private readonly permissionService = inject(PermissionService);

    private readonly reportService = injectAsync(
        () =>
            import('@services/dashboard-report.service').then(
                (module) => module.DashboardReportService,
            ),
        { prefetch: onIdle },
    );

    ngOnInit(): void {
        ignorePromise(this.authService.refreshProfile());
    }

    readonly statsSkeletonItems = Array.from({ length: STATS_SKELETON_COUNT }, (_, i) => i);

    displayName = computed(() => {
        const user = this.authService.currentUser();
        if (user?.firstName) return user.firstName;
        if (user?.email) return user.email.split('@')[0];
        return 'User';
    });

    stats = computed(() => {
        const data = this.dashboardService.stats();
        return data ? mapDashboardStats(data) : [];
    });

    canManageContacts = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageContacts),
    );
    canManageDeals = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageDeals),
    );

    refreshStats(): void {
        this.dashboardService.reloadStats();
        ignorePromise(this.reportService().then((report) => report.trackRefresh()));
        this.toastService.success('Dashboard refreshed', 'Stats updated successfully.');
    }

    navigateTo(route: string): void {
        ignorePromise(this.router.navigateByUrl(route));
    }

    async createContact(menu: import('@shared/components/dropdown-menu.component').DropdownMenuComponent): Promise<void> {
        menu.close();
        const ref = await this.dialogService.openLazy<
            import('@features/contacts/contact-create-dialog.component').ContactCreateDialogComponent,
            undefined,
            import('@features/contacts/contact-create-dialog.component').ContactCreateDialogResult
        >(() =>
            import('@features/contacts/contact-create-dialog.component').then(
                (m) => m.ContactCreateDialogComponent,
            ),
        );
        ref.afterClosed().subscribe((result) => {
            if (result === 'created') this.dashboardService.reloadStats();
        });
    }

    async createDeal(menu: import('@shared/components/dropdown-menu.component').DropdownMenuComponent): Promise<void> {
        menu.close();
        const ref = await this.dialogService.openLazy<
            import('@features/deals/deal-create-dialog.component').DealCreateDialogComponent,
            undefined,
            import('@features/deals/deal-create-dialog.component').DealCreateDialogResult
        >(() => import('@features/deals/deal-create-dialog.component').then((m) => m.DealCreateDialogComponent));
        ref.afterClosed().subscribe((result) => {
            if (result === 'created') this.dashboardService.reloadStats();
        });
    }

    goToBoard(menu: import('@shared/components/dropdown-menu.component').DropdownMenuComponent): void {
        menu.close();
        ignorePromise(this.router.navigate(['/dashboard/deals/board']));
    }

    goToTags(menu: import('@shared/components/dropdown-menu.component').DropdownMenuComponent): void {
        menu.close();
        ignorePromise(this.router.navigate(['/dashboard/tags']));
    }
}

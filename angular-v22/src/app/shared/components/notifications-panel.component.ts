/**
 * Notifications Panel — recent workspace activity in header dropdown
 */

import { Component, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardService } from '@services/index';
import {
    DropdownItemComponent,
    DropdownLabelComponent,
    DropdownMenuComponent,
    DropdownSeparatorComponent,
} from '@shared/components/dropdown-menu.component';
import { ignorePromise } from '@utils/form-display.util';

import { IconComponent } from './icon.component';
import { SkeletonComponent } from './skeleton.component';

@Component({
    selector: 'app-notifications-panel',
    imports: [
        IconComponent,
        SkeletonComponent,
        DropdownMenuComponent,
        DropdownItemComponent,
        DropdownLabelComponent,
        DropdownSeparatorComponent,
    ],
    template: `
        <app-dropdown-menu #notificationsMenu align="end">
            <button
                dropdownTrigger
                type="button"
                class="btn btn-outline btn-sm relative hidden sm:inline-flex"
                aria-label="Notifications"
            >
                <app-icon name="bell" [size]="14" />
                <span class="hidden md:inline">Notifications</span>
                @if (activityCount() > 0) {
                    <span class="notification-badge" aria-hidden="true">{{ activityCount() }}</span>
                }
            </button>
            <div dropdownContent class="notification-panel">
                <app-dropdown-label>Recent activity</app-dropdown-label>
                @if (dashboardService.isLoading()) {
                    <div class="space-y-2 px-2 py-1">
                        @for (_ of skeletonItems; track $index) {
                            <app-skeleton className="h-10 w-full rounded-md" />
                        }
                    </div>
                } @else if (activities().length === 0) {
                    <p class="px-2 py-2 text-sm text-muted-foreground">No recent activity</p>
                } @else {
                    @for (item of activities(); track item.id) {
                        <div class="notification-item">
                            <div class="notification-item-icon" aria-hidden="true">
                                <app-icon name="activity" [size]="12" />
                            </div>
                            <div class="min-w-0 flex-1 space-y-0.5">
                                <p class="truncate text-sm font-medium text-foreground">
                                    {{ item.action }}
                                </p>
                                <p class="truncate text-xs text-muted-foreground">
                                    {{ item.description }}
                                </p>
                            </div>
                            <span class="shrink-0 text-[10px] text-muted-foreground">{{
                                item.time
                            }}</span>
                        </div>
                    }
                }
                <app-dropdown-separator />
                <app-dropdown-item (itemClick)="goToDashboard(notificationsMenu)">
                    <app-icon name="layout-dashboard" [size]="14" />
                    View dashboard
                </app-dropdown-item>
                <app-dropdown-item (itemClick)="goToActivities(notificationsMenu)">
                    <app-icon name="activity" [size]="14" />
                    All activities
                </app-dropdown-item>
            </div>
        </app-dropdown-menu>
    `,
    styles: `
        .notification-badge {
            @apply absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground;
        }

        .notification-panel {
            @apply w-80 max-w-[calc(100vw-2rem)];
        }

        .notification-item {
            @apply flex items-start gap-2 px-2 py-2;
        }

        .notification-item-icon {
            @apply mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground;
        }
    `,
})
export class NotificationsPanelComponent implements OnInit {
    readonly dashboardService = inject(DashboardService);
    private readonly router = inject(Router);

    readonly skeletonItems = Array.from({ length: 3 }, (_, i) => i);

    activities = computed(() => this.dashboardService.stats()?.recentActivity ?? []);
    activityCount = computed(() => Math.min(this.activities().length, 9));

    ngOnInit(): void {
        if (!this.dashboardService.stats()) {
            this.dashboardService.reloadStats();
        }
    }

    goToDashboard(menu: DropdownMenuComponent): void {
        menu.close();
        ignorePromise(this.router.navigate(['/dashboard']));
    }

    goToActivities(menu: DropdownMenuComponent): void {
        menu.close();
        ignorePromise(this.router.navigate(['/dashboard/activities']));
    }
}

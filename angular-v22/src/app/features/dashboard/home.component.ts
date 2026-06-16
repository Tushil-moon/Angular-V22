/**
 * Dashboard Home Page — shadcn-style overview
 */

import { Component, computed, inject, injectAsync, onIdle } from '@angular/core';
import { AuthService, DashboardService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
  CardComponent,
  CardHeaderComponent,
  CardDescriptionComponent,
  CardBodyComponent,
  SkeletonComponent,
  ButtonComponent,
  IconComponent,
} from '@shared/components';
import { mapDashboardStats, STATS_SKELETON_COUNT } from '@shared/config/dashboard.config';
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
  ],
  template: `
    <div class="page-shell">
      <div class="page-toolbar">
        <div class="page-header">
          <h1 class="page-title">Welcome back, {{ displayName() }}</h1>
          <p class="page-description">Here's what's happening in your workspace today.</p>
        </div>
        <div class="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <app-button class="w-full sm:w-auto" variant="outline" size="sm" (clicked)="refreshStats()">
            Refresh
          </app-button>
          <app-button class="w-full sm:w-auto" size="sm" (clicked)="showWelcomeToast()">
            <app-icon name="plus" [size]="14" />
            Quick action
          </app-button>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        @if (!dashboardService.isLoading()) {
          @for (stat of stats(); track stat.label) {
            <app-card>
              <app-card-header [row]="true">
                <app-card-description>{{ stat.label }}</app-card-description>
                <div class="stat-icon">
                  <app-icon [name]="stat.icon" [size]="16" className="text-muted-foreground" />
                </div>
              </app-card-header>
              <app-card-body>
                <div class="text-2xl font-bold tracking-tight">{{ stat.value }}</div>
                <p class="text-xs text-muted-foreground mt-1">{{ stat.detail }}</p>
              </app-card-body>
            </app-card>
          }
        } @else {
          @for (_ of statsSkeletonItems; track $index) {
            <app-card>
              <app-card-header [row]="true">
                <app-skeleton className="h-3 w-20" />
                <app-skeleton className="h-8 w-8 shrink-0 rounded-md" />
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
})
export class DashboardHomeComponent {
  authService = inject(AuthService);
  dashboardService = inject(DashboardService);
  toastService = inject(ToastService);

  private readonly reportService = injectAsync(
    () =>
      import('@services/dashboard-report.service').then((module) => module.DashboardReportService),
    { prefetch: onIdle },
  );

  constructor() {
    void this.authService.refreshProfile();
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

  refreshStats(): void {
    this.dashboardService.reloadStats();
    void this.reportService().then((report) => report.trackRefresh());
    this.toastService.success('Dashboard refreshed', 'Stats updated successfully.');
  }

  showWelcomeToast(): void {
    this.toastService.show({
      title: 'Action completed',
      description: 'This is a shadcn-style toast notification.',
    });
  }
}

/**
 * Dashboard Panels — activity feed and quick links (deferred chunk)
 */

import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, DashboardService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
  CardComponent,
  CardHeaderComponent,
  CardTitleComponent,
  CardDescriptionComponent,
  CardBodyComponent,
  CardFooterComponent,
  SkeletonComponent,
  IconComponent,
  SeparatorComponent,
} from '@shared/components';
import { ACTIVITY_SKELETON_COUNT, QUICK_LINKS } from '@shared/config/dashboard.config';

@Component({
  selector: 'app-dashboard-panels',
  imports: [
    RouterLink,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardBodyComponent,
    CardFooterComponent,
    SkeletonComponent,
    IconComponent,
    SeparatorComponent,
  ],
  template: `
    <div class="grid gap-4 lg:grid-cols-7">
      <app-card class="lg:col-span-4">
        <app-card-header>
          <app-card-title>Recent activity</app-card-title>
          <app-card-description>Latest events across your workspace</app-card-description>
        </app-card-header>
        <app-card-body>
          @if (dashboardService.isLoading()) {
            <div class="divide-y divide-border">
              @for (_ of activitySkeletonItems; track $index) {
                <div class="flex items-center gap-3 py-3 first:pt-0 last:pb-0 sm:gap-4">
                  <app-skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <div class="min-w-0 flex-1 space-y-2">
                    <app-skeleton className="h-4 w-3/4 max-w-[12rem]" />
                    <app-skeleton className="h-3 w-1/2 max-w-[9rem]" />
                  </div>
                  <app-skeleton className="hidden h-3 w-12 shrink-0 sm:block" />
                </div>
              }
            </div>
          } @else if (recentActivities().length === 0) {
            <div
              class="flex min-h-10 items-center justify-center border-b border-border py-3 text-center last:border-0"
            >
              <p class="text-sm text-muted-foreground">No activity yet</p>
            </div>
          } @else {
            <div class="divide-y divide-border">
              @for (item of recentActivities(); track item.id) {
                <div class="flex items-center gap-3 py-3 first:pt-0 last:pb-0 sm:gap-4">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"
                  >
                    <app-icon name="activity" [size]="14" className="text-muted-foreground" />
                  </div>
                  <div class="min-w-0 flex-1 space-y-1">
                    <p class="text-sm font-medium leading-none truncate">{{ item.action }}</p>
                    <p class="text-sm text-muted-foreground truncate">{{ item.description }}</p>
                  </div>
                  <span class="hidden shrink-0 text-xs text-muted-foreground sm:inline">{{
                    item.time
                  }}</span>
                </div>
              }
            </div>
          }
        </app-card-body>
      </app-card>

      <app-card class="lg:col-span-3">
        <app-card-header>
          <app-card-title>Quick links</app-card-title>
          <app-card-description>Jump to common tasks</app-card-description>
        </app-card-header>
        <app-card-body class="space-y-1">
          @for (link of quickLinks; track link.label; let last = $last) {
            @if (link.route) {
              <a [routerLink]="link.route" class="quick-link">
                <app-icon [name]="link.icon" [size]="16" />
                <span>{{ link.label }}</span>
                <app-icon
                  name="chevron-right"
                  [size]="14"
                  className="ml-auto text-muted-foreground"
                />
              </a>
            } @else {
              <button type="button" class="quick-link w-full" (click)="showWelcomeToast()">
                <app-icon [name]="link.icon" [size]="16" />
                <span>{{ link.label }}</span>
                <app-icon
                  name="chevron-right"
                  [size]="14"
                  className="ml-auto text-muted-foreground"
                />
              </button>
            }
            @if (!last) {
              <app-separator />
            }
          }
        </app-card-body>
        <app-card-footer>
          <p class="text-xs text-muted-foreground">
            Signed in as <span class="font-medium text-foreground">{{ userEmail() }}</span>
          </p>
        </app-card-footer>
      </app-card>
    </div>
  `,
})
export class DashboardPanelsComponent {
  dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly quickLinks = QUICK_LINKS;
  readonly activitySkeletonItems = Array.from({ length: ACTIVITY_SKELETON_COUNT }, (_, i) => i);

  userEmail = computed(() => this.authService.currentUser()?.email ?? '');

  recentActivities = computed(() => this.dashboardService.stats()?.recentActivity ?? []);

  showWelcomeToast(): void {
    this.toastService.show({
      title: 'Action completed',
      description: 'This is a shadcn-style toast notification.',
    });
  }
}

/**
 * Layout Components
 */

import { Component, DestroyRef, inject, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import { SidebarService } from '@services/sidebar.service';
import {
  PLATFORM_NAV_ITEMS,
  PROFILE_MENU_ITEMS,
  filterNavItemsByPermission,
  resolvePageTitle,
  type ProfileMenuItem,
} from '@shared/config/navigation.config';
import { AvatarComponent } from '../components/avatar.component';
import { IconComponent } from '../components/icon.component';
import { NavMenuComponent } from '../components/nav-menu.component';
import {
  DropdownMenuComponent,
  DropdownItemComponent,
  DropdownLabelComponent,
  DropdownSeparatorComponent,
} from '../components/dropdown-menu.component';
import { SheetComponent } from '../components/sheet.component';
import { SeparatorComponent } from '../components/separator.component';
import { ThemeToggleComponent } from '../components/theme-toggle.component';
import { GlobalSearchComponent } from '../components/global-search.component';
import { OrgSwitcherComponent } from '../components/org-switcher.component';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, ThemeToggleComponent],
  template: `
    <div class="min-h-svh bg-muted/40 flex items-center justify-center p-4">
      <div class="absolute right-4 top-4">
        <app-theme-toggle />
      </div>
      <div class="w-full max-w-sm space-y-6">
        <div class="flex flex-col items-center space-y-2 text-center mb-4">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          >
            <span class="text-sm font-bold">A</span>
          </div>
        </div>
        <router-outlet />
      </div>
    </div>
  `,
})
export class AuthLayoutComponent {}

@Component({
  selector: 'app-admin-layout',
  imports: [
    RouterOutlet,
    AvatarComponent,
    IconComponent,
    NavMenuComponent,
    DropdownMenuComponent,
    DropdownItemComponent,
    DropdownLabelComponent,
    DropdownSeparatorComponent,
    SheetComponent,
    SeparatorComponent,
    ThemeToggleComponent,
    GlobalSearchComponent,
    OrgSwitcherComponent,
  ],
  template: `
    <div
      class="sidebar-wrapper"
      [attr.data-state]="sidebarService.state()"
      [attr.data-collapsible]="'icon'"
    >
      <aside class="sidebar hidden md:flex" [attr.data-state]="sidebarService.state()">
        <div class="sidebar-inner">
          <div class="sidebar-header">
            <div class="sidebar-brand">
              <div class="sidebar-brand-icon shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
                </svg>
              </div>
              <div class="sidebar-brand-text">
                <span class="sidebar-brand-title">Angular V22</span>
                <span class="sidebar-brand-subtitle">Workspace</span>
              </div>
            </div>
            <button
              type="button"
              class="sidebar-header-toggle"
              (click)="sidebarService.toggle()"
              aria-label="Toggle sidebar"
            >
              <app-icon name="chevrons-up-down" [size]="16" />
            </button>
          </div>

          <div class="sidebar-content custom-scrollbar">
            <div class="sidebar-group">
              <p class="sidebar-group-label sidebar-collapsible-text">Platform</p>
              <app-nav-menu [items]="navItems()" [collapsed]="sidebarService.collapsed()" />
            </div>
          </div>

          <div class="sidebar-footer">
            <div class="sidebar-theme">
              <app-theme-toggle [sidebar]="true" />
            </div>
            <div class="sidebar-user">
              <app-avatar [fallback]="userInitials()" size="sm" />
              <div class="sidebar-user-info sidebar-collapsible-text">
                <span class="sidebar-user-name">{{ displayName() }}</span>
                <span class="sidebar-user-email">{{ userEmail() }}</span>
              </div>
              <app-dropdown-menu #sidebarUserMenu align="end">
                <button
                  dropdownTrigger
                  type="button"
                  class="sidebar-user-menu"
                  aria-label="Account menu"
                >
                  <app-icon name="more-vertical" [size]="16" />
                </button>
                <div dropdownContent>
                  <app-dropdown-label>
                    <div class="flex flex-col">
                      <span class="text-sm font-medium">{{ displayName() }}</span>
                      <span class="text-xs text-muted-foreground">{{ userEmail() }}</span>
                    </div>
                  </app-dropdown-label>
                  @for (item of profileMenuItems; track item.label) {
                    @if (item.destructive) {
                      <app-dropdown-separator />
                    }
                    <app-dropdown-item
                      [destructive]="item.destructive ?? false"
                      (itemClick)="onProfileMenuAction(item, sidebarUserMenu)"
                    >
                      <app-icon [name]="item.icon" [size]="14" />
                      {{ item.label }}
                    </app-dropdown-item>
                  }
                </div>
              </app-dropdown-menu>
            </div>
          </div>
        </div>
      </aside>

      <div class="sidebar-inset">
        <header class="site-header">
          <div class="site-header-start">
            <button
              type="button"
              class="btn btn-ghost btn-icon sidebar-trigger -ml-1 hidden md:inline-flex"
              (click)="sidebarService.toggle()"
              aria-label="Toggle sidebar"
            >
              <app-icon name="panel-left" [size]="18" className="sidebar-trigger-icon" />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-icon -ml-1 md:hidden"
              (click)="mobileNavOpen.set(true)"
              aria-label="Open menu"
            >
              <app-icon name="menu" [size]="18" />
            </button>
            <app-separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
            <app-org-switcher />
            <app-global-search />
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span class="site-header-title hidden xl:inline">{{ pageTitle() }}</span>
            <button
              type="button"
              class="btn btn-outline btn-sm hidden sm:inline-flex"
              (click)="showDemoToast()"
            >
              <app-icon name="bell" [size]="14" />
              <span class="hidden md:inline">Notifications</span>
            </button>

            <div class="md:hidden">
              <app-dropdown-menu #profileMenu align="end">
              <button dropdownTrigger type="button" class="btn btn-ghost btn-sm gap-2 pl-1 pr-2">
                <app-avatar [fallback]="userInitials()" size="sm" />
                <app-icon name="chevron-down" [size]="14" className="text-muted-foreground" />
              </button>
              <div dropdownContent>
                <app-dropdown-label>
                  <div class="flex flex-col">
                    <span class="text-sm font-medium">{{ displayName() }}</span>
                    <span class="text-xs text-muted-foreground">{{ userEmail() }}</span>
                  </div>
                </app-dropdown-label>
                @for (item of profileMenuItems; track item.label) {
                  @if (item.destructive) {
                    <app-dropdown-separator />
                  }
                  <app-dropdown-item
                    [destructive]="item.destructive ?? false"
                    (itemClick)="onProfileMenuAction(item, profileMenu)"
                  >
                    <app-icon [name]="item.icon" [size]="14" />
                    {{ item.label }}
                  </app-dropdown-item>
                }
              </div>
            </app-dropdown-menu>
            </div>
          </div>
        </header>

        <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div class="page-content container-responsive flex min-h-0 flex-1 flex-col">
            <router-outlet />
          </div>
        </main>
      </div>
    </div>

    <app-sheet
      title="Navigation"
      [isOpen]="mobileNavOpen()"
      (isOpenChange)="mobileNavOpen.set($event)"
    >
      <div class="sidebar-group !px-0">
        <p class="sidebar-group-label">Platform</p>
        <app-nav-menu [items]="navItems()" labelClass="" (itemSelected)="mobileNavOpen.set(false)" />
      </div>

      <app-separator className="my-4" />

      <div class="mb-4">
        <app-theme-toggle />
      </div>

      <button type="button" class="sidebar-menu-button w-full" (click)="logout()">
        <app-icon name="log-out" [size]="16" />
        <span>Log out</span>
      </button>
    </app-sheet>
  `,
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  sidebarService = inject(SidebarService);
  private readonly permissionService = inject(PermissionService);

  readonly navItems = computed(() =>
    filterNavItemsByPermission(PLATFORM_NAV_ITEMS, (...permissions) =>
      this.permissionService.hasAny(...permissions),
    ),
  );
  readonly profileMenuItems = PROFILE_MENU_ITEMS;

  mobileNavOpen = signal(false);
  pageTitle = signal('Dashboard');

  displayName = computed(() => {
    const user = this.authService.currentUser();
    if (user?.firstName) return `${user.firstName} ${user.lastName ?? ''}`.trim();
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  });

  userEmail = computed(() => this.authService.currentUser()?.email ?? '');
  userInitials = computed(() => this.authService.userInitials() || 'U');

  constructor() {
    this.pageTitle.set(resolvePageTitle(this.router.url));
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => this.pageTitle.set(resolvePageTitle(e.urlAfterRedirects)));
  }

  onProfileMenuAction(item: ProfileMenuItem, menu: DropdownMenuComponent): void {
    menu.close();
    if (item.action === 'logout') {
      void this.logout();
      return;
    }
    if (item.route) {
      void this.router.navigateByUrl(item.route);
    }
  }

  showDemoToast(): void {
    this.toastService.success('Notification sent', 'Your workspace is up to date.');
  }

  async logout(): Promise<void> {
    this.mobileNavOpen.set(false);
    await this.authService.signOut();
    this.toastService.success('Signed out', 'You have been logged out successfully.');
    void this.router.navigate(['/auth/signin']);
  }
}

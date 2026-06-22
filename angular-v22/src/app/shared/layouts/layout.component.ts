/**
 * Layout Components
 */

import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AuthService, PermissionService } from '@services/index';
import { SidebarService } from '@services/sidebar.service';
import { ToastService } from '@services/toast.service';
import {
    filterNavItemsByPermission,
    PLATFORM_NAV_ITEMS,
    PROFILE_MENU_ITEMS,
    type ProfileMenuItem,
    resolvePageTitle,
} from '@shared/config/navigation.config';
import { ignorePromise } from '@utils/form-display.util';
import { filter } from 'rxjs/operators';

import { AvatarComponent } from '../components/avatar.component';
import {
    DropdownItemComponent,
    DropdownLabelComponent,
    DropdownMenuComponent,
    DropdownSeparatorComponent,
} from '../components/dropdown-menu.component';
import { GlobalSearchComponent } from '../components/global-search.component';
import { IconComponent } from '../components/icon.component';
import { NavMenuComponent } from '../components/nav-menu.component';
import { OrgSwitcherComponent } from '../components/org-switcher.component';
import { SeparatorComponent } from '../components/separator.component';
import { SheetComponent } from '../components/sheet.component';
import { ThemeToggleComponent } from '../components/theme-toggle.component';

@Component({
    selector: 'app-auth-layout',
    imports: [RouterOutlet, ThemeToggleComponent],
    template: `
        <div class="auth-shell">
            <div class="auth-shell-theme">
                <app-theme-toggle />
            </div>
            <div class="auth-shell-content">
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
                            <div class="sidebar-brand-text sidebar-collapsible-text">
                                <span class="sidebar-brand-title">Angular V22</span>
                                <span class="sidebar-brand-subtitle">Workspace</span>
                            </div>
                        </div>
                    </div>

                    <div class="sidebar-content custom-scrollbar">
                        <div class="sidebar-group">
                            <p class="sidebar-group-label sidebar-collapsible-text">Platform</p>
                            <app-nav-menu
                                [items]="navItems()"
                                [collapsed]="sidebarService.collapsed()"
                            />
                        </div>
                    </div>

                    <div class="sidebar-footer">
                        <div class="sidebar-user-shell">
                            <app-dropdown-menu #sidebarUserMenu align="end" class="sidebar-user-menu">
                                <button
                                    dropdownTrigger
                                    type="button"
                                    class="sidebar-user"
                                    aria-label="Account menu"
                                >
                                    <app-avatar
                                        [fallback]="userInitials()"
                                        size="sm"
                                        className="sidebar-user-avatar"
                                    />
                                    <div class="sidebar-user-info sidebar-collapsible-text">
                                        <span class="sidebar-user-name">{{ displayName() }}</span>
                                        <span class="sidebar-user-email">{{ userEmail() }}</span>
                                    </div>
                                    <app-icon
                                        name="chevrons-up-down"
                                        [size]="16"
                                        className="sidebar-user-chevron sidebar-collapsible-text"
                                    />
                                </button>
                                <div dropdownContent>
                                    <app-dropdown-label>
                                        <div class="flex flex-col">
                                            <span class="text-sm font-medium">{{ displayName() }}</span>
                                            <span class="text-xs text-muted-foreground">{{
                                                userEmail()
                                            }}</span>
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
                <div class="sidebar-inset-main">
                    <header class="site-header">
                        <div class="site-header-start">
                            <button
                                type="button"
                                class="sidebar-trigger-btn hidden md:inline-flex"
                                (click)="sidebarService.toggle()"
                                aria-label="Toggle sidebar"
                            >
                                <app-icon
                                    name="panel-left"
                                    [size]="16"
                                    className="sidebar-trigger-icon"
                                />
                            </button>
                            <button
                                type="button"
                                class="sidebar-trigger-btn md:hidden"
                                (click)="mobileNavOpen.set(true)"
                                aria-label="Open menu"
                            >
                                <app-icon name="menu" [size]="16" />
                            </button>
                            <app-separator
                                orientation="vertical"
                                className="site-header-separator hidden md:block"
                            />
                            <nav class="site-header-breadcrumb hidden lg:flex" aria-label="Breadcrumb">
                                <span class="site-header-breadcrumb-muted">Dashboard</span>
                                <app-icon name="chevron-right" [size]="14" className="text-muted-foreground" />
                                <span class="site-header-breadcrumb-current">{{ pageTitle() }}</span>
                            </nav>
                            <div class="site-header-tools">
                                <app-org-switcher mode="header" />
                                <app-global-search variant="header" />
                                <button
                                    type="button"
                                    class="sidebar-trigger-btn sm:hidden"
                                    (click)="mobileSearchOpen.set(true)"
                                    aria-label="Open search"
                                >
                                    <app-icon name="search" [size]="16" />
                                </button>
                            </div>
                        </div>

                        <div class="site-header-actions">
                            <app-theme-toggle class="hidden sm:inline-flex" />
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
                                <button
                                    dropdownTrigger
                                    type="button"
                                    class="btn btn-ghost btn-sm gap-2 pl-1 pr-2"
                                >
                                    <app-avatar [fallback]="userInitials()" size="sm" />
                                    <app-icon
                                        name="chevron-down"
                                        [size]="14"
                                        className="text-muted-foreground"
                                    />
                                </button>
                                <div dropdownContent>
                                    <app-dropdown-label>
                                        <div class="flex flex-col">
                                            <span class="text-sm font-medium">{{
                                                displayName()
                                            }}</span>
                                            <span class="text-xs text-muted-foreground">{{
                                                userEmail()
                                            }}</span>
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
        </div>

        <app-sheet
            title="Navigation"
            [isOpen]="mobileNavOpen()"
            (isOpenChange)="mobileNavOpen.set($event)"
        >
            <div class="sidebar-group !px-0">
                <p class="sidebar-group-label">Platform</p>
                <app-nav-menu
                    [items]="navItems()"
                    labelClass=""
                    (itemSelected)="mobileNavOpen.set(false)"
                />
            </div>

            <app-separator className="my-4" />

            <div class="mobile-drawer-section">
                <p class="sidebar-group-label mb-2">Organization</p>
                <app-org-switcher mode="drawer" />
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

        <app-sheet
            title="Search"
            [isOpen]="mobileSearchOpen()"
            (isOpenChange)="mobileSearchOpen.set($event)"
        >
            <app-global-search variant="drawer" />
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
    mobileSearchOpen = signal(false);
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
            ignorePromise(this.logout());
            return;
        }
        if (item.route) {
            ignorePromise(this.router.navigateByUrl(item.route));
        }
    }

    showDemoToast(): void {
        this.toastService.success('Notification sent', 'Your workspace is up to date.');
    }

    async logout(): Promise<void> {
        this.mobileNavOpen.set(false);
        await this.authService.signOut();
        this.toastService.success('Signed out', 'You have been logged out successfully.');
        ignorePromise(this.router.navigate(['/auth/signin']));
    }
}

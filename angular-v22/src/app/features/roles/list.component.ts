/**
 * Roles List Page Component
 */

import { Component, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { DialogService, PermissionService, RoleService } from '@services/index';
import {
    ButtonComponent,
    CardBodyComponent,
    CardComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
    IconComponent,
    SearchInputComponent,
    SkeletonComponent,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';

import { RoleCreateDialogComponent, RoleCreateDialogResult } from './role-create-dialog.component';

@Component({
    selector: 'app-roles-list',
    imports: [
        CardComponent,
        CardHeaderComponent,
        CardTitleComponent,
        CardDescriptionComponent,
        CardBodyComponent,
        SkeletonComponent,
        SearchInputComponent,
        ButtonComponent,
        IconComponent,
    ],
    template: `
        <div class="page-shell">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">Roles</h1>
                    <p class="page-description">Manage roles and permissions</p>
                </div>
                @if (canManage()) {
                    <app-button class="w-full sm:w-auto" size="sm" (clicked)="openCreateDialog()">
                        <app-icon name="plus" [size]="14" />
                        Create role
                    </app-button>
                }
            </div>

            <app-card>
                <app-card-header [row]="true">
                    <div class="min-w-0 space-y-1">
                        <app-card-title>All roles</app-card-title>
                        <app-card-description
                            >{{ filteredRoles().length }} roles shown</app-card-description
                        >
                    </div>
                    <div class="card-toolbar">
                        <app-search-input
                            placeholder="Search roles..."
                            [initialValue]="searchQuery()"
                            (searchChange)="searchQuery.set($event)"
                        />
                    </div>
                </app-card-header>

                <app-card-body>
                    @if (roleService.isLoading()) {
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            @for (_ of skeletonItems(); track $index) {
                                <div class="role-card space-y-4">
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="min-w-0 flex-1 space-y-2">
                                            <app-skeleton className="h-4 w-28" />
                                            <app-skeleton className="h-3 w-full max-w-[10rem]" />
                                        </div>
                                        <app-skeleton className="h-5 w-14 shrink-0 rounded-full" />
                                    </div>
                                    <app-skeleton className="h-3 w-24" />
                                </div>
                            }
                        </div>
                    } @else if (filteredRoles().length === 0) {
                        <div
                            class="flex min-h-10 items-center justify-center rounded-md border border-dashed border-border px-4 py-3 text-center"
                        >
                            <p class="text-sm text-muted-foreground">No roles found</p>
                        </div>
                    } @else {
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            @for (role of filteredRoles(); track role.id) {
                                <div class="role-card space-y-4">
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="min-w-0 space-y-1">
                                            <h3
                                                class="text-sm font-semibold leading-none text-foreground"
                                            >
                                                {{ role.name }}
                                            </h3>
                                            <p class="text-sm text-muted-foreground">
                                                {{ role.description || 'No description' }}
                                            </p>
                                        </div>
                                        <span
                                            [class]="
                                                role.isActive
                                                    ? 'badge badge-success'
                                                    : 'badge badge-danger'
                                            "
                                        >
                                            {{ role.isActive ? 'Active' : 'Inactive' }}
                                        </span>
                                    </div>
                                    @if (role.permissions?.length) {
                                        <div class="flex flex-wrap gap-1.5">
                                            @for (
                                                permission of role.permissions!.slice(0, 4);
                                                track permission.id
                                            ) {
                                                <span class="badge badge-secondary text-[10px]">{{
                                                    permission.code
                                                }}</span>
                                            }
                                            @if (role.permissions.length > 4) {
                                                <span class="text-xs text-muted-foreground">
                                                    +{{ role.permissions.length - 4 }} more
                                                </span>
                                            }
                                        </div>
                                    }
                                    <p class="text-xs text-muted-foreground">
                                        {{ role.permissions?.length || 0 }} permissions
                                    </p>
                                </div>
                            }
                        </div>
                    }
                </app-card-body>
            </app-card>
        </div>
    `,
    styleUrl: './list.component.scss',
    encapsulation: ViewEncapsulation.None,
})
export class RolesListComponent {
    roleService = inject(RoleService);
    private readonly dialogService = inject(DialogService);
    private readonly permissionService = inject(PermissionService);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageRoles),
    );

    searchQuery = signal('');
    skeletonItems = computed(() => Array.from({ length: 6 }, (_, i) => i));

    filteredRoles = computed(() => {
        const query = this.searchQuery().trim().toLowerCase();
        const roles = this.roleService.roles();
        if (!query) return roles;

        return roles.filter(
            (role) =>
                role.name.toLowerCase().includes(query) ||
                role.description?.toLowerCase().includes(query),
        );
    });

    async openCreateDialog(): Promise<void> {
        const ref = await this.dialogService.openLazy<
            RoleCreateDialogComponent,
            undefined,
            RoleCreateDialogResult
        >(() => import('./role-create-dialog.component').then((m) => m.RoleCreateDialogComponent));

        ref.afterClosed().subscribe((result) => {
            if (result === 'created') {
                this.roleService.reloadRoles();
            }
        });
    }
}

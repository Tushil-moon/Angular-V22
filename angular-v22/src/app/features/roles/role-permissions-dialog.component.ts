/**
 * Role Permissions Dialog — edit role permission matrix
 */

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Permission, Role } from '@models/index';
import { RoleService } from '@services/index';
import { ToastService } from '@services/toast.service';
import { ButtonComponent, DialogComponent, LoaderComponent } from '@shared/components';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';

export interface RolePermissionsDialogData {
    role: Role;
}

export type RolePermissionsDialogResult = 'updated';

const PERMISSION_GROUPS: { label: string; prefix: string }[] = [
    { label: 'Contacts', prefix: 'contacts' },
    { label: 'Deals', prefix: 'deals' },
    { label: 'Companies', prefix: 'companies' },
    { label: 'Activities', prefix: 'activities' },
    { label: 'Users', prefix: 'users' },
    { label: 'Roles', prefix: 'roles' },
];

@Component({
    selector: 'app-role-permissions-dialog',
    host: { class: 'contents' },
    imports: [DialogComponent, ButtonComponent, LoaderComponent],
    template: `
        <app-dialog
            [title]="'Permissions: ' + data.role.name"
            description="Toggle permissions for this role."
            size="lg"
            [showFooter]="true"
        >
            @if (isLoading()) {
                <div class="dialog-loading">
                    <app-loader />
                </div>
            } @else {
                <div class="space-y-6">
                    @for (group of permissionGroups; track group.label) {
                        <div class="space-y-2">
                            <p class="text-sm font-medium text-foreground">{{ group.label }}</p>
                            <div class="grid gap-2 sm:grid-cols-2">
                                @for (perm of permissionsForGroup(group.prefix); track perm.id) {
                                    <label class="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            class="checkbox"
                                            [checked]="isSelected(perm.id)"
                                            (change)="togglePermission(perm.id, $event)"
                                        />
                                        <span>{{ perm.code }}</span>
                                    </label>
                                }
                            </div>
                        </div>
                    }
                </div>
            }

            <div dialogFooter>
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                <app-button type="button" [disabled]="isSaving()" (clicked)="save()">
                    @if (isSaving()) {
                        Saving...
                    } @else {
                        Save permissions
                    }
                </app-button>
            </div>
        </app-dialog>
    `,
})
export class RolePermissionsDialogComponent implements OnInit {
    private readonly roleService = inject(RoleService);
    private readonly toastService = inject(ToastService);
    private readonly dialogRef = inject(
        DialogRef<RolePermissionsDialogComponent, RolePermissionsDialogResult>,
    );
    readonly data = inject<RolePermissionsDialogData>(DIALOG_DATA);

    readonly permissionGroups = PERMISSION_GROUPS;

    allPermissions = computed(() => this.roleService.permissions());
    selectedIds = signal<Set<string>>(new Set());
    isLoading = signal(true);
    isSaving = signal(false);

    ngOnInit(): void {
        const existing = new Set(this.data.role.permissions?.map((p) => p.id) ?? []);
        this.selectedIds.set(existing);
        this.isLoading.set(false);
    }

    permissionsForGroup(prefix: string): Permission[] {
        return this.allPermissions().filter((p) => p.code.includes(`:${prefix}`));
    }

    isSelected(id: string): boolean {
        return this.selectedIds().has(id);
    }

    togglePermission(id: string, event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        this.selectedIds.update((set) => {
            const next = new Set(set);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    async save(): Promise<void> {
        this.isSaving.set(true);
        try {
            await this.roleService.updateRolePermissions(
                this.data.role.id,
                Array.from(this.selectedIds()),
            );
            this.toastService.success('Permissions updated', `${this.data.role.name} saved.`);
            this.dialogRef.close('updated');
        } catch {
            this.toastService.show({
                title: 'Update failed',
                description: 'Could not save permissions.',
                variant: 'destructive',
            });
        } finally {
            this.isSaving.set(false);
        }
    }
}

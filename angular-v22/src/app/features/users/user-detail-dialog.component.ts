/**
 * User Detail Dialog — view, edit, roles, delete
 */

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RoleService, UserService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
  DialogComponent,
  ButtonComponent,
  AvatarComponent,
  LoaderComponent,
  IconComponent,
  InputComponent,
  CheckboxComponent,
  BadgeComponent,
  DropdownMenuComponent,
  DropdownItemComponent,
} from '@shared/components';
import type { BadgeVariant } from '@shared/components/badge.component';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';
import { User } from '@models/index';
import { userUpdateSchema, safeValidate } from '@utils/validators';
import { buildUserDetailFields, getUserDisplayName, getUserInitials } from './user.utils';

export interface UserDetailDialogData {
  userId: string;
}

export type UserDetailDialogResult = 'deleted' | 'updated';

type DialogMode = 'view' | 'edit' | 'delete';

@Component({
  selector: 'app-user-detail-dialog',
  host: { class: 'contents' },
  imports: [
    ReactiveFormsModule,
    DialogComponent,
    ButtonComponent,
    AvatarComponent,
    LoaderComponent,
    IconComponent,
    InputComponent,
    CheckboxComponent,
    BadgeComponent,
    DropdownMenuComponent,
    DropdownItemComponent,
  ],
  template: `
    <app-dialog
      [title]="dialogTitle()"
      [description]="dialogDescription()"
      size="lg"
      [showFooter]="footerVisible()"
    >
      @if (mode() === 'delete') {
        <p class="text-sm text-muted-foreground">
          Delete
          <span class="font-medium text-foreground">{{ selectedUser()?.email }}</span>?
          This user will lose access immediately and cannot be restored.
        </p>
      } @else if (isLoading()) {
        <div class="dialog-loading">
          <app-loader />
        </div>
      } @else if (selectedUser(); as user) {
        @if (mode() === 'edit') {
          <form [formGroup]="editForm" class="space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <app-input
                id="edit-email"
                type="email"
                label="Email"
                formControlName="email"
                [error]="fieldError('email')"
                [required]="true"
              />
              <app-input
                id="edit-phone"
                type="text"
                label="Phone"
                formControlName="phone"
                [error]="fieldError('phone')"
              />
            </div>
            <app-checkbox id="edit-active" label="Active account" formControlName="isActive" />
          </form>
        } @else {
          <div class="space-y-6">
            <div class="dialog-profile-header">
              <div class="dialog-profile-identity">
                <app-avatar [fallback]="getUserInitials(user)" size="lg" />
                <div class="min-w-0 space-y-1">
                  <p class="truncate text-lg font-semibold text-foreground">{{ getUserDisplayName(user) }}</p>
                  <p class="truncate text-sm text-muted-foreground">{{ user.email }}</p>
                </div>
              </div>
              <app-badge [variant]="accountStatusVariant(user)">{{ accountStatusLabel(user) }}</app-badge>
            </div>

            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              @for (field of detailFields(); track field.label) {
                <div class="space-y-1">
                  <dt class="text-xs font-medium text-muted-foreground">{{ field.label }}</dt>
                  <dd>
                    @if (field.type === 'badge' && field.badgeVariant) {
                      <app-badge [variant]="field.badgeVariant">{{ field.value }}</app-badge>
                    } @else {
                      <span class="text-sm text-foreground">{{ field.value }}</span>
                    }
                  </dd>
                </div>
              }
            </dl>

            <div class="dialog-roles-section">
              <div class="flex items-center justify-between gap-2">
                <div class="space-y-0.5">
                  <p class="text-sm font-medium text-foreground">Roles</p>
                  <p class="text-xs text-muted-foreground">Manage permissions for this account</p>
                </div>
                <app-dropdown-menu align="end">
                  <button
                    dropdownTrigger
                    type="button"
                    class="btn btn-outline btn-sm inline-flex items-center gap-2"
                    [disabled]="isRoleUpdating() || assignableRoles().length === 0"
                  >
                    Assign role
                    <app-icon name="chevron-down" [size]="14" className="text-muted-foreground" />
                  </button>
                  <div dropdownContent>
                    @for (role of assignableRoles(); track role.id) {
                      <app-dropdown-item (itemClick)="assignRole(role.name)">
                        {{ role.name }}
                      </app-dropdown-item>
                    } @empty {
                      <app-dropdown-item [disabled]="true">All roles assigned</app-dropdown-item>
                    }
                  </div>
                </app-dropdown-menu>
              </div>

              @if (isRoleUpdating()) {
                <div class="flex justify-center py-2">
                  <app-loader size="sm" />
                </div>
              } @else {
                <div class="flex flex-wrap gap-2">
                  @for (role of user.roles ?? []; track role.name) {
                    <app-badge variant="secondary" class="dialog-role-badge">
                      {{ role.name }}
                      <button
                        type="button"
                        class="dialog-role-remove"
                        (click)="removeRole(role.name)"
                        [attr.aria-label]="'Remove ' + role.name"
                      >
                        <app-icon name="x" [size]="12" />
                      </button>
                    </app-badge>
                  } @empty {
                    <span class="text-sm text-muted-foreground">No roles assigned</span>
                  }
                </div>
              }
            </div>
          </div>
        }
      } @else {
        <p class="text-sm text-muted-foreground">User not found or you do not have access.</p>
      }

      <div dialogFooter>
        @if (mode() === 'view' && selectedUser()) {
          <app-button variant="outline" type="button" (clicked)="mode.set('delete')">Delete</app-button>
          <app-button variant="outline" type="button" (clicked)="startEdit()">Edit</app-button>
          <app-button type="button" (clicked)="close()">Close</app-button>
        } @else if (mode() === 'delete') {
          <app-button variant="outline" type="button" (clicked)="mode.set('view')">Cancel</app-button>
          <app-button variant="destructive" type="button" [disabled]="isDeleting()" (clicked)="confirmDelete()">
            @if (isDeleting()) {
              <app-loader size="sm" [inline]="true" />
            } @else {
              Delete user
            }
          </app-button>
        } @else if (mode() === 'edit') {
          <app-button variant="outline" type="button" (clicked)="cancelEdit()">Cancel</app-button>
          <app-button type="button" [disabled]="isSaving()" (clicked)="saveEdit()">
            @if (isSaving()) {
              <app-loader size="sm" [inline]="true" />
            } @else {
              Save changes
            }
          </app-button>
        }
      </div>
    </app-dialog>
  `,
})
export class UserDetailDialogComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = inject(DialogRef<UserDetailDialogComponent, UserDetailDialogResult>);
  private readonly data = inject<UserDetailDialogData>(DIALOG_DATA);

  readonly getUserDisplayName = getUserDisplayName;
  readonly getUserInitials = getUserInitials;

  selectedUser = signal<User | null>(null);
  mode = signal<DialogMode>('view');
  isLoading = signal(true);
  isDeleting = signal(false);
  isSaving = signal(false);
  isRoleUpdating = signal(false);
  wasUpdated = signal(false);
  fieldErrors = signal<Record<string, string[]>>({});

  editForm = this.fb.group({
    email: [''],
    phone: [''],
    isActive: [true],
  });

  detailFields = computed(() => {
    const user = this.selectedUser();
    return user ? buildUserDetailFields(user) : [];
  });

  assignableRoles = computed(() => {
    const user = this.selectedUser();
    const assigned = new Set(user?.roles?.map((role) => role.name) ?? []);
    return this.roleService.roles().filter((role) => !assigned.has(role.name));
  });

  footerVisible = computed(() => {
    if (this.isLoading()) return false;
    if (this.mode() === 'view' && !this.selectedUser()) return false;
    return true;
  });

  dialogTitle = computed(() => {
    if (this.mode() === 'delete') return 'Delete user';
    if (this.mode() === 'edit') return 'Edit user';
    return this.selectedUser() ? getUserDisplayName(this.selectedUser()!) : 'User details';
  });

  dialogDescription = computed(() => {
    switch (this.mode()) {
      case 'delete':
        return 'This action cannot be undone.';
      case 'edit':
        return 'Update account email, phone, and active status.';
      default:
        return this.selectedUser()?.email ?? 'View account information and roles.';
    }
  });

  ngOnInit(): void {
    void this.roleService.reloadRoles();
    void this.loadUser(this.data.userId);
  }

  accountStatusLabel(user: User): string {
    return user.isActive ? 'Active' : 'Inactive';
  }

  accountStatusVariant(user: User): BadgeVariant {
    return user.isActive ? 'success' : 'secondary';
  }

  close(): void {
    this.dialogRef.close(this.wasUpdated() ? 'updated' : undefined);
  }

  startEdit(): void {
    const user = this.selectedUser();
    if (!user) return;

    this.editForm.patchValue({
      email: user.email,
      phone: user.phone ?? '',
      isActive: user.isActive,
    });
    this.mode.set('edit');
  }

  cancelEdit(): void {
    this.fieldErrors.set({});
    this.mode.set('view');
  }

  async saveEdit(): Promise<void> {
    const user = this.selectedUser();
    if (!user) return;

    const raw = this.editForm.getRawValue();
    const payload = {
      email: raw.email.trim(),
      phone: raw.phone.trim() || undefined,
      isActive: raw.isActive,
    };

    const validation = safeValidate(userUpdateSchema, payload);
    if (!validation.success) {
      this.fieldErrors.set(validation.errors ?? {});
      return;
    }

    this.isSaving.set(true);
    this.fieldErrors.set({});

    try {
      const updated = await this.userService.updateUser(user.id, validation.data!);
      if (updated) {
        this.selectedUser.set(updated);
        this.wasUpdated.set(true);
        this.mode.set('view');
        this.toastService.success('User updated', 'Changes saved successfully.');
      }
    } catch {
      this.toastService.show({
        title: 'Update failed',
        description: 'Could not save user changes.',
        variant: 'destructive',
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  fieldError(field: string): string | null {
    return this.fieldErrors()[field]?.[0] ?? null;
  }

  async assignRole(roleName: string): Promise<void> {
    const user = this.selectedUser();
    if (!user) return;

    this.isRoleUpdating.set(true);
    try {
      const success = await this.roleService.assignRole(user.id, roleName);
      if (success) {
        await this.loadUser(user.id, { silent: true });
        this.wasUpdated.set(true);
        this.toastService.success('Role assigned', `${roleName} added to user.`);
      }
    } finally {
      this.isRoleUpdating.set(false);
    }
  }

  async removeRole(roleName: string): Promise<void> {
    const user = this.selectedUser();
    if (!user) return;

    this.isRoleUpdating.set(true);
    try {
      const success = await this.roleService.removeRoleFromUser(user.id, roleName);
      if (success) {
        await this.loadUser(user.id, { silent: true });
        this.wasUpdated.set(true);
        this.toastService.success('Role removed', `${roleName} removed from user.`);
      }
    } finally {
      this.isRoleUpdating.set(false);
    }
  }

  async confirmDelete(): Promise<void> {
    const user = this.selectedUser();
    if (!user) return;

    this.isDeleting.set(true);

    try {
      const success = await this.userService.deleteUser(user.id);
      if (success) {
        this.toastService.show({
          title: 'User deleted',
          description: `${user.email} has been removed.`,
        });
        this.dialogRef.close('deleted');
      }
    } catch {
      this.toastService.show({
        title: 'Delete failed',
        description: 'Could not delete this user.',
        variant: 'destructive',
      });
    } finally {
      this.isDeleting.set(false);
    }
  }

  private async loadUser(userId: string, options?: { silent?: boolean }): Promise<void> {
    if (!options?.silent) {
      this.isLoading.set(true);
    }

    const user = await this.userService.getUserById(userId);
    if (user) {
      this.selectedUser.set(user);
    } else if (!options?.silent) {
      this.selectedUser.set(null);
    }

    if (!options?.silent) {
      this.isLoading.set(false);
    }
    this.userService.clearCurrentUser();
  }
}

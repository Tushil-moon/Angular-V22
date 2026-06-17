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
  DropdownMenuComponent,
  DropdownItemComponent,
} from '@shared/components';
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
    DropdownMenuComponent,
    DropdownItemComponent,
  ],
  template: `
    <app-dialog [title]="dialogTitle()" [description]="dialogDescription()">
      @if (mode() === 'delete') {
        <p class="text-sm text-muted-foreground">
          Are you sure you want to delete
          <span class="font-medium text-foreground">{{ selectedUser()?.email }}</span>?
        </p>
      } @else if (isLoading()) {
        <div class="flex justify-center py-8">
          <app-loader />
        </div>
      } @else if (selectedUser(); as user) {
        @if (mode() === 'edit') {
          <form [formGroup]="editForm" class="space-y-4">
            <app-input
              id="edit-email"
              type="email"
              label="Email"
              formControlName="email"
              [error]="fieldError('email')"
            />
            <app-input
              id="edit-phone"
              type="text"
              label="Phone"
              formControlName="phone"
              [error]="fieldError('phone')"
            />
            <app-checkbox id="edit-active" label="Active account" formControlName="isActive" />
          </form>
        } @else {
          <div class="space-y-6">
            <div class="flex items-center gap-4">
              <app-avatar [fallback]="getUserInitials(user)" size="lg" />
              <div class="space-y-1">
                <p class="text-sm font-medium text-foreground">{{ getUserDisplayName(user) }}</p>
                <p class="text-sm text-muted-foreground">{{ user.email }}</p>
              </div>
            </div>

            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              @for (field of detailFields(); track field.label) {
                <div class="space-y-1">
                  <dt class="text-xs font-medium text-muted-foreground">{{ field.label }}</dt>
                  <dd>
                    @if (field.type === 'badge') {
                      <span [class]="field.badgeClass">{{ field.value }}</span>
                    } @else {
                      <span class="text-sm text-foreground">{{ field.value }}</span>
                    }
                  </dd>
                </div>
              }
            </dl>

            <div class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-medium">Roles</p>
                <app-dropdown-menu align="end">
                  <button dropdownTrigger type="button" class="dashboard-role-trigger">
                    Assign role
                    <app-icon name="chevron-down" [size]="14" className="text-muted-foreground" />
                  </button>
                  <div dropdownContent>
                    @for (role of availableRoles(); track role.id) {
                      <app-dropdown-item (itemClick)="assignRole(role.name)">
                        {{ role.name }}
                      </app-dropdown-item>
                    }
                  </div>
                </app-dropdown-menu>
              </div>
              <div class="flex flex-wrap gap-2">
                @for (role of user.roles ?? []; track role.name) {
                  <span class="badge badge-secondary inline-flex items-center gap-1">
                    {{ role.name }}
                    <button
                      type="button"
                      class="rounded-sm p-0.5 hover:bg-muted"
                      (click)="removeRole(role.name)"
                      aria-label="Remove {{ role.name }}"
                    >
                      <app-icon name="x" [size]="12" />
                    </button>
                  </span>
                } @empty {
                  <span class="text-sm text-muted-foreground">No roles assigned</span>
                }
              </div>
            </div>
          </div>
        }
      }

      <div dialogFooter class="flex justify-end gap-2">
        @if (mode() === 'delete') {
          <app-button variant="outline" type="button" (clicked)="mode.set('view')">Cancel</app-button>
          <app-button variant="destructive" type="button" [disabled]="isDeleting()" (clicked)="confirmDelete()">
            @if (isDeleting()) {
              <app-loader size="sm" [inline]="true" />
            } @else {
              Confirm delete
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
        } @else {
          <app-button variant="outline" type="button" (clicked)="close()">Close</app-button>
          <app-button variant="outline" type="button" (clicked)="startEdit()">
            <app-icon name="settings" [size]="14" />
            Edit
          </app-button>
          <app-button
            variant="destructive"
            type="button"
            [disabled]="!selectedUser()"
            (clicked)="mode.set('delete')"
          >
            <app-icon name="trash-2" [size]="14" />
            Delete
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
  isLoading = signal(false);
  isDeleting = signal(false);
  isSaving = signal(false);
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

  availableRoles = computed(() => this.roleService.roles());

  dialogTitle = computed(() => {
    if (this.mode() === 'delete') return 'Delete user';
    if (this.mode() === 'edit') return 'Edit user';
    return 'User details';
  });

  dialogDescription = computed(() => {
    if (this.mode() === 'delete') {
      return 'This action cannot be undone. The user will be removed from the system.';
    }
    return this.selectedUser()?.email || 'View account information';
  });

  ngOnInit(): void {
    void this.roleService.reloadRoles();
    void this.loadUser(this.data.userId);
  }

  close(): void {
    this.dialogRef.close();
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

    const success = await this.roleService.assignRole(user.id, roleName);
    if (success) {
      await this.loadUser(user.id);
      this.toastService.success('Role assigned', `${roleName} added to user.`);
    }
  }

  async removeRole(roleName: string): Promise<void> {
    const user = this.selectedUser();
    if (!user) return;

    const success = await this.roleService.removeRoleFromUser(user.id, roleName);
    if (success) {
      await this.loadUser(user.id);
      this.toastService.success('Role removed', `${roleName} removed from user.`);
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
    } finally {
      this.isDeleting.set(false);
    }
  }

  private async loadUser(userId: string): Promise<void> {
    this.isLoading.set(true);

    const user = await this.userService.getUserById(userId);
    if (user) {
      this.selectedUser.set(user);
    }

    this.isLoading.set(false);
    this.userService.clearCurrentUser();
  }
}

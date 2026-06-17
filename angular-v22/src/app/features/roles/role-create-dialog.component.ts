/**
 * Role Create Dialog
 */

import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RoleService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
  DialogComponent,
  ButtonComponent,
  InputComponent,
  LoaderComponent,
} from '@shared/components';
import { DialogRef } from '@shared/dialog';
import { createRoleSchema, safeValidate } from '@utils/validators';

export type RoleCreateDialogResult = 'created';

@Component({
  selector: 'app-role-create-dialog',
  host: { class: 'contents' },
  imports: [ReactiveFormsModule, DialogComponent, ButtonComponent, InputComponent, LoaderComponent],
  template: `
    <app-dialog title="Create role" description="Add a new role to the system.">
      <form id="role-create-form" [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <app-input
          id="role-name"
          label="Role name"
          placeholder="e.g. Editor"
          formControlName="name"
          [error]="fieldError('name')"
          [required]="true"
        />
        <app-input
          id="role-description"
          label="Description"
          placeholder="Optional description"
          formControlName="description"
          [error]="fieldError('description')"
        />
      </form>

      <div dialogFooter>
        <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
        <app-button type="submit" form="role-create-form" [disabled]="isSubmitting()">
          @if (isSubmitting()) {
            <app-loader size="sm" [inline]="true" />
          } @else {
            Create role
          }
        </app-button>
      </div>
    </app-dialog>
  `,
})
export class RoleCreateDialogComponent {
  private readonly roleService = inject(RoleService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = inject(DialogRef<RoleCreateDialogComponent, RoleCreateDialogResult>);

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
  });

  fieldErrors = signal<Record<string, string[]>>({});
  isSubmitting = signal(false);

  close(): void {
    this.dialogRef.close();
  }

  fieldError(field: string): string | null {
    return this.fieldErrors()[field]?.[0] ?? null;
  }

  async onSubmit(): Promise<void> {
    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name.trim(),
      description: raw.description.trim() || undefined,
    };

    const validation = safeValidate(createRoleSchema, payload);
    if (!validation.success) {
      this.fieldErrors.set(validation.errors ?? {});
      return;
    }

    this.fieldErrors.set({});
    this.isSubmitting.set(true);

    try {
      const role = await this.roleService.createRole(validation.data!);
      if (role) {
        this.toastService.show({
          title: 'Role created',
          description: `${role.name} has been added.`,
        });
        this.dialogRef.close('created');
      }
    } catch {
      this.toastService.show({
        title: 'Failed to create role',
        description: 'Please check the details and try again.',
        variant: 'destructive',
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

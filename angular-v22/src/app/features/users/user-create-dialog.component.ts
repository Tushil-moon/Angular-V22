/**
 * User Create Dialog — popup form to add a new user
 */

import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
  DialogComponent,
  ButtonComponent,
  InputComponent,
  LoaderComponent,
} from '@shared/components';
import { DialogRef } from '@shared/dialog';
import { USER_CREATE_FIELDS, USER_CREATE_NAME_FIELDS } from '@shared/config/auth-form.config';
import { userCreateSchema, safeValidate, UserCreateInput } from '@utils/validators';

export type UserCreateDialogResult = 'created';

@Component({
  selector: 'app-user-create-dialog',
  host: { class: 'contents' },
  imports: [ReactiveFormsModule, DialogComponent, ButtonComponent, InputComponent, LoaderComponent],
  template: `
    <app-dialog title="Add user" description="Create a new user account with email and password.">
      <form id="user-create-form" [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          @for (field of nameFields; track field.name) {
            <app-input
              [id]="'create-' + field.name"
              [type]="field.type"
              [label]="field.label"
              [placeholder]="field.placeholder"
              [formControlName]="field.name"
              [error]="getFieldError(field.name)"
            />
          }
        </div>

        @for (field of fields; track field.name) {
          <app-input
            [id]="'create-' + field.name"
            [type]="field.type"
            [label]="field.label"
            [placeholder]="field.placeholder"
            [formControlName]="field.name"
            [required]="field.required ?? false"
            [error]="getFieldError(field.name)"
          />
        }
      </form>

      <div dialogFooter>
        <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
        <app-button type="submit" form="user-create-form" [disabled]="isSubmitting()">
          @if (isSubmitting()) {
            <app-loader size="sm" [inline]="true" />
          } @else {
            Create user
          }
        </app-button>
      </div>
    </app-dialog>
  `,
})
export class UserCreateDialogComponent {
  private readonly userService = inject(UserService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = inject(DialogRef<UserCreateDialogComponent, UserCreateDialogResult>);

  readonly nameFields = USER_CREATE_NAME_FIELDS;
  readonly fields = USER_CREATE_FIELDS;

  form = this.fb.group({
    email: ['', Validators.required],
    password: ['', Validators.required],
    firstName: [''],
    lastName: [''],
  });

  fieldErrors = signal<Record<string, string[]>>({});
  isSubmitting = signal(false);

  close(): void {
    this.dialogRef.close();
  }

  getFieldError(field: string): string | null {
    return this.fieldErrors()[field]?.[0] ?? null;
  }

  async onSubmit(): Promise<void> {
    const raw = this.form.getRawValue();
    const payload = {
      email: raw.email.trim(),
      password: raw.password,
      firstName: raw.firstName.trim() || undefined,
      lastName: raw.lastName.trim() || undefined,
    };

    const validation = safeValidate(userCreateSchema, payload);
    if (!validation.success) {
      this.fieldErrors.set(validation.errors ?? {});
      return;
    }

    this.fieldErrors.set({});
    this.isSubmitting.set(true);

    try {
      const user = await this.userService.createUser(validation.data as UserCreateInput);
      if (user) {
        this.toastService.show({
          title: 'User created',
          description: `${user.email} has been added successfully.`,
        });
        this.dialogRef.close('created');
      }
    } catch {
      this.toastService.show({
        title: 'Failed to create user',
        description: 'Please check the details and try again.',
        variant: 'destructive',
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

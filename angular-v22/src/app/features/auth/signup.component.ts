/**
 * Sign Up Page Component
 */

import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@services/index';
import { InputComponent } from '@shared/components/input.component';
import {
  CardComponent,
  CardHeaderComponent,
  CardTitleComponent,
  CardDescriptionComponent,
  CardBodyComponent,
} from '@shared/components/card.component';
import { AlertComponent } from '@shared/components/alert.component';
import { SubmitButtonComponent } from '@shared/components/submit-button.component';
import { SIGN_UP_FIELDS, SIGN_UP_NAME_FIELDS } from '@shared/config/auth-form.config';
import { signUpSchema, safeValidate } from '@utils/validators';

@Component({
  selector: 'app-signup',
  imports: [
    ReactiveFormsModule,
    InputComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardBodyComponent,
    AlertComponent,
    SubmitButtonComponent,
  ],
  template: `
    <app-card>
      <app-card-header>
        <app-card-title>Create an account</app-card-title>
        <app-card-description>Enter your details below to get started</app-card-description>
      </app-card-header>

      <app-card-body>
        @if (authService.error()) {
          <app-alert
            type="danger"
            title="Sign up failed"
            [message]="authService.error() || ''"
            [dismissible]="true"
            (dismissed)="authService.clearError()"
            class="mb-4 block"
          />
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            @for (field of nameFields; track field.name) {
              <app-input
                [id]="field.name"
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
              [id]="field.name"
              [type]="field.type"
              [label]="field.label"
              [placeholder]="field.placeholder"
              [formControlName]="field.name"
              [error]="getFieldError(field.name)"
              [required]="field.required ?? false"
            />
          }

          <app-submit-button
            label="Create account"
            loadingLabel="Creating account..."
            [loading]="authService.isLoading()"
          />
        </form>
      </app-card-body>
    </app-card>

    <p class="text-center text-sm text-muted-foreground mt-4">
      Already have an account?
      <a href="/auth/signin" class="text-foreground underline-offset-4 hover:underline font-medium"
        >Sign in</a
      >
    </p>
  `,
})
export class SignUpComponent {
  authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly nameFields = SIGN_UP_NAME_FIELDS;
  readonly fields = SIGN_UP_FIELDS;

  form = this.fb.group({
    email: ['', Validators.required],
    password: ['', Validators.required],
    confirmPassword: ['', Validators.required],
    firstName: [''],
    lastName: [''],
  });

  validationErrors = signal<Record<string, string[]>>({});

  async onSubmit(): Promise<void> {
    const raw = this.form.getRawValue();
    const validation = safeValidate(signUpSchema, {
      email: raw.email,
      password: raw.password,
      confirmPassword: raw.confirmPassword,
      firstName: raw.firstName || undefined,
      lastName: raw.lastName || undefined,
    });

    if (!validation.success) {
      this.validationErrors.set(validation.errors || {});
      return;
    }

    this.validationErrors.set({});

    try {
      await this.authService.signUp({
        email: raw.email,
        password: raw.password,
        confirmPassword: raw.confirmPassword,
        firstName: raw.firstName || undefined,
        lastName: raw.lastName || undefined,
      });
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Sign up error:', error);
    }
  }

  getFieldError(field: string): string | null {
    const errors = this.validationErrors()[field];
    return errors?.[0] ?? null;
  }
}

/**
 * Forgot Password Page
 */

import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@services/index';
import { InputComponent } from '@shared/components/input.component';
import { AlertComponent } from '@shared/components/alert.component';
import { SubmitButtonComponent } from '@shared/components/submit-button.component';
import { AuthCardComponent } from '@shared/components/auth-card.component';
import { forgotPasswordSchema, safeValidate } from '@utils/validators';
import {
  addTouchedField,
  clearFieldFromErrors,
  resolveFieldError,
  shouldShowFieldError,
} from '@utils/form-display.util';

@Component({
  selector: 'app-forgot-password',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    InputComponent,
    AlertComponent,
    SubmitButtonComponent,
    AuthCardComponent,
  ],
  template: `
    <app-auth-card
      title="Forgot your password?"
      description="Please enter the email address associated with your account and we will email you a link to reset your password."
    >
      @if (success()) {
        <app-alert
          type="success"
          title="Check your email"
          message="If an account exists for that address, reset instructions have been sent."
        />
      } @else {
        @if (error()) {
          <app-alert type="danger" title="Request failed" [message]="error()!" class="block" />
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <app-input
            id="email"
            type="email"
            label="Email"
            placeholder="example@example.com"
            formControlName="email"
            [required]="true"
            [error]="fieldError('email')"
            (blurred)="onFieldBlur('email')"
            (valueChange)="onFieldInput('email')"
          />

          <div class="auth-submit-stack">
            <app-submit-button
              label="Forgot password"
              loadingLabel="Sending..."
              [loading]="authService.isLoading()"
            />
          </div>
        </form>
      }

      <p class="auth-card-footer">
        <a routerLink="/auth/signin">Back to login</a>
      </p>
    </app-auth-card>
  `,
})
export class ForgotPasswordComponent {
  authService = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  form = this.fb.group({
    email: ['', Validators.required],
  });

  validationErrors = signal<Record<string, string[]>>({});
  readonly submitted = signal(false);
  readonly touchedFields = signal<Set<string>>(new Set());
  success = signal(false);
  error = signal<string | null>(null);

  onFieldBlur(field: string): void {
    this.touchedFields.update((set) => addTouchedField(set, field));
  }

  onFieldInput(field: string): void {
    this.validationErrors.update((errors) => clearFieldFromErrors(errors, field));
  }

  async onSubmit(): Promise<void> {
    this.submitted.set(true);

    const validation = safeValidate(forgotPasswordSchema, this.form.getRawValue());
    if (!validation.success) {
      this.validationErrors.set(validation.errors ?? {});
      return;
    }

    this.validationErrors.set({});
    this.error.set(null);

    try {
      await this.authService.requestPasswordReset(validation.data!.email);
      this.success.set(true);
    } catch (err: unknown) {
      this.error.set(
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Unable to send reset email.',
      );
    }
  }

  fieldError(field: string): string | null {
    const show = shouldShowFieldError({
      touched: this.touchedFields().has(field),
      submitted: this.submitted(),
    });
    return resolveFieldError(this.validationErrors()[field]?.[0], show);
  }
}

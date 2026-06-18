/**
 * Reset Password Page
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@services/index';
import { InputComponent } from '@shared/components/input.component';
import { AlertComponent } from '@shared/components/alert.component';
import { SubmitButtonComponent } from '@shared/components/submit-button.component';
import { AuthCardComponent } from '@shared/components/auth-card.component';
import { passwordResetSchema, safeValidate } from '@utils/validators';
import {
  addTouchedField,
  clearFieldFromErrors,
  resolveFieldError,
  shouldShowFieldError,
} from '@utils/form-display.util';

@Component({
  selector: 'app-reset-password',
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
      title="Reset password"
      description="Choose a new password for your account"
    >
      @if (!token()) {
        <app-alert
          type="danger"
          title="Invalid link"
          message="This reset link is missing a token. Request a new reset email."
        />
      } @else if (success()) {
        <app-alert
          type="success"
          title="Password updated"
          message="You can now sign in with your new password."
        />
      } @else {
        @if (error()) {
          <app-alert type="danger" title="Reset failed" [message]="error()!" class="block" />
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <app-input
            id="password"
            type="password"
            label="New password"
            placeholder="Enter your password"
            formControlName="password"
            [required]="true"
            [error]="fieldError('password')"
            (blurred)="onFieldBlur('password')"
            (valueChange)="onFieldInput('password')"
          />
          <app-input
            id="confirmPassword"
            type="password"
            label="Confirm password"
            placeholder="Confirm your password"
            formControlName="confirmPassword"
            [required]="true"
            [error]="fieldError('confirmPassword')"
            (blurred)="onFieldBlur('confirmPassword')"
            (valueChange)="onFieldInput('confirmPassword')"
          />

          <div class="auth-submit-stack">
            <app-submit-button
              label="Reset password"
              loadingLabel="Updating..."
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
export class ResetPasswordComponent implements OnInit {
  authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  form = this.fb.group({
    password: ['', Validators.required],
    confirmPassword: ['', Validators.required],
  });

  token = signal('');
  validationErrors = signal<Record<string, string[]>>({});
  readonly submitted = signal(false);
  readonly touchedFields = signal<Set<string>>(new Set());
  success = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get('token') ?? '');
  }

  onFieldBlur(field: string): void {
    this.touchedFields.update((set) => addTouchedField(set, field));
  }

  onFieldInput(field: string): void {
    this.validationErrors.update((errors) => clearFieldFromErrors(errors, field));
  }

  async onSubmit(): Promise<void> {
    this.submitted.set(true);

    const validation = safeValidate(passwordResetSchema, this.form.getRawValue());
    if (!validation.success) {
      this.validationErrors.set(validation.errors ?? {});
      return;
    }

    this.validationErrors.set({});
    this.error.set(null);

    try {
      await this.authService.resetPassword(this.token(), validation.data!.password);
      this.success.set(true);
    } catch (err: unknown) {
      this.error.set(
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Unable to reset password.',
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

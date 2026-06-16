/**
 * Reset Password Page
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { passwordResetSchema, safeValidate } from '@utils/validators';

@Component({
  selector: 'app-reset-password',
  imports: [
    RouterLink,
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
        <app-card-title>Reset password</app-card-title>
        <app-card-description>Choose a new password for your account.</app-card-description>
      </app-card-header>

      <app-card-body>
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
          <a
            routerLink="/auth/signin"
            class="mt-4 inline-flex text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Go to sign in
          </a>
        } @else {
          @if (error()) {
            <app-alert type="danger" title="Reset failed" [message]="error()!" class="mb-4 block" />
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <app-input
              id="password"
              type="password"
              label="New password"
              placeholder="Create a password"
              formControlName="password"
              [error]="fieldError('password')"
              [required]="true"
            />
            <app-input
              id="confirmPassword"
              type="password"
              label="Confirm password"
              placeholder="Confirm your password"
              formControlName="confirmPassword"
              [error]="fieldError('confirmPassword')"
              [required]="true"
            />

            <app-submit-button
              label="Reset password"
              loadingLabel="Updating..."
              [loading]="authService.isLoading()"
            />
          </form>
        }
      </app-card-body>
    </app-card>
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
  success = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get('token') ?? '');
  }

  async onSubmit(): Promise<void> {
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
    return this.validationErrors()[field]?.[0] ?? null;
  }
}

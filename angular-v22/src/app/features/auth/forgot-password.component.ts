/**
 * Forgot Password Page
 */

import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
import { forgotPasswordSchema, safeValidate } from '@utils/validators';

@Component({
  selector: 'app-forgot-password',
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
        <app-card-title>Forgot password</app-card-title>
        <app-card-description>Enter your email and we'll send reset instructions.</app-card-description>
      </app-card-header>

      <app-card-body>
        @if (success()) {
          <app-alert
            type="success"
            title="Check your email"
            message="If an account exists for that address, reset instructions have been sent."
          />
        } @else {
          @if (error()) {
            <app-alert type="danger" title="Request failed" [message]="error()!" class="mb-4 block" />
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <app-input
              id="email"
              type="email"
              label="Email"
              placeholder="name@example.com"
              formControlName="email"
              [error]="fieldError('email')"
              [required]="true"
            />

            <app-submit-button
              label="Send reset link"
              loadingLabel="Sending..."
              [loading]="authService.isLoading()"
            />
          </form>
        }
      </app-card-body>
    </app-card>

    <p class="mt-4 text-center text-sm text-muted-foreground">
      <a routerLink="/auth/signin" class="font-medium text-foreground underline-offset-4 hover:underline">
        Back to sign in
      </a>
    </p>
  `,
})
export class ForgotPasswordComponent {
  authService = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  form = this.fb.group({
    email: ['', Validators.required],
  });

  validationErrors = signal<Record<string, string[]>>({});
  success = signal(false);
  error = signal<string | null>(null);

  async onSubmit(): Promise<void> {
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
    return this.validationErrors()[field]?.[0] ?? null;
  }
}

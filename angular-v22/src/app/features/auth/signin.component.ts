/**
 * Sign In Page Component — Signal Forms (Angular v22)
 */

import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { form, FormField, required, schema, submit } from '@angular/forms/signals';
import { AuthService } from '@services/index';
import { ToastService } from '@services/toast.service';
import { InputComponent } from '@shared/components/input.component';
import { SubmitButtonComponent } from '@shared/components/submit-button.component';
import { CheckboxComponent } from '@shared/components/checkbox.component';
import { AuthCardComponent } from '@shared/components/auth-card.component';
import { AuthSocialButtonsComponent } from '@shared/components/auth-social-buttons.component';
import { SIGN_IN_FIELDS, type AuthFormField } from '@shared/config/auth-form.config';
import { signInSchema, safeValidate } from '@utils/validators';
import {
  clearFieldFromErrors,
  resolveFieldError,
  shouldShowFieldError,
} from '@utils/form-display.util';

@Component({
  selector: 'app-signin',
  imports: [
    RouterLink,
    FormField,
    InputComponent,
    SubmitButtonComponent,
    CheckboxComponent,
    AuthCardComponent,
    AuthSocialButtonsComponent,
  ],
  template: `
    <app-auth-card
      title="Welcome to Angular V22"
      description="Login to your account now"
    >
      <div class="auth-card-stack">
        <app-auth-social-buttons action="signin" />

        <div class="auth-divider" aria-hidden="true">
          <span>or sign in with</span>
        </div>

        <form (submit)="onSubmit($event)" class="auth-form">
          @for (field of fields; track field.name) {
            <app-input
              [id]="field.name"
              [type]="field.type"
              [label]="field.label"
              [placeholder]="field.placeholder"
              [formField]="form[field.name]"
              [required]="field.required ?? false"
              [error]="fieldError(field.name)"
              (valueChange)="onFieldInput(field.name)"
            />
          }

          <div class="auth-form-row">
            <app-checkbox id="remember-device" label="Remember this device" />
            <a
              routerLink="/auth/forgot-password"
              class="text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
            >
              Forgot password?
            </a>
          </div>

          <div class="auth-submit-stack">
            <app-submit-button
              label="Sign in"
              loadingLabel="Signing in..."
              [loading]="authService.isLoading()"
            />
            <p class="auth-card-footer">
              <span>Don't have an account?</span>
              <a routerLink="/auth/signup">Create an account</a>
            </p>
          </div>
        </form>
      </div>
    </app-auth-card>
  `,
})
export class SignInComponent {
  authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly fields = SIGN_IN_FIELDS as Array<AuthFormField & { name: 'email' | 'password' }>;

  private readonly signInModel = signal({
    email: '',
    password: '',
  });

  readonly form = form(
    this.signInModel,
    schema((f) => {
      required(f.email, { message: 'Email is required' });
      required(f.password, { message: 'Password is required' });
    }),
  );

  readonly submitted = signal(false);
  readonly zodErrors = signal<Record<string, string[]>>({});

  fieldError(name: 'email' | 'password'): string | null {
    const field = this.form[name]();
    const show = shouldShowFieldError({
      touched: field.touched(),
      submitted: this.submitted(),
    });
    const zodMessage = this.zodErrors()[name]?.[0];
    const signalMessage = field.errors()[0]?.message;
    return resolveFieldError(zodMessage ?? signalMessage, show);
  }

  onFieldInput(name: 'email' | 'password'): void {
    this.zodErrors.update((errors) => clearFieldFromErrors(errors, name));
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitted.set(true);

    const validation = safeValidate(signInSchema, this.signInModel());
    if (!validation.success) {
      this.zodErrors.set(validation.errors ?? {});
      return;
    }
    this.zodErrors.set({});

    await submit(this.form, {
      action: async (f) => {
        try {
          const credentials = f().value();
          await this.authService.signIn(credentials);
          await this.router.navigate(['/dashboard']);
        } catch {
          this.showAuthErrorToast('Sign in failed');
        }
      },
    });
  }

  private showAuthErrorToast(title: string): void {
    const message = this.authService.error();
    if (!message) return;
    this.toastService.error(title, message);
    this.authService.clearError();
  }
}

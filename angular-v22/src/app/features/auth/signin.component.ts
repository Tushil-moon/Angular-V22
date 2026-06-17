/**
 * Sign In Page Component — Signal Forms (Angular v22)
 */

import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { form, FormField, required, schema, submit } from '@angular/forms/signals';
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

@Component({
  selector: 'app-signin',
  imports: [
    RouterLink,
    FormField,
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
        <app-card-title>Welcome back</app-card-title>
        <app-card-description>Enter your credentials to sign in</app-card-description>
      </app-card-header>

      <app-card-body>
        @if (authService.error()) {
          <app-alert
            type="danger"
            title="Sign in failed"
            [message]="authService.error() || ''"
            [dismissible]="true"
            (dismissed)="authService.clearError()"
            class="mb-4 block"
          />
        }

        <form (submit)="onSubmit($event)" class="space-y-4">
          <app-input
            id="email"
            type="email"
            label="Email"
            placeholder="name@example.com"
            [formField]="form.email"
            [error]="fieldError('email')"
            [required]="true"
          />

          <app-input
            id="password"
            type="password"
            label="Password"
            placeholder="Enter your password"
            [formField]="form.password"
            [error]="fieldError('password')"
            [required]="true"
          />

          <div class="text-right">
            <a
              routerLink="/auth/forgot-password"
              class="text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
            >
              Forgot password?
            </a>
          </div>

          <app-submit-button
            label="Sign in"
            loadingLabel="Signing in..."
            [loading]="authService.isLoading()"
          />
        </form>
      </app-card-body>
    </app-card>

    <p class="text-center text-sm text-muted-foreground mt-4">
      Don't have an account?
      <a routerLink="/auth/signup" class="text-foreground underline-offset-4 hover:underline font-medium"
        >Sign up</a
      >
    </p>
  `,
})
export class SignInComponent {
  authService = inject(AuthService);
  private readonly router = inject(Router);

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

  fieldError(name: 'email' | 'password'): string | null {
    return this.form[name]().errors()[0]?.message ?? null;
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    await submit(this.form, {
      action: async (f) => {
        const credentials = f().value();
        await this.authService.signIn(credentials);
        await this.router.navigate(['/dashboard']);
      },
    });
  }
}

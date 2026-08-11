/**
 * Sign In Page — Signal Forms
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, required, schema } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@services/index';
import { ToastService } from '@services/toast.service';
import { AuthCardComponent } from '@shared/components/auth-card.component';
import { AuthSocialButtonsComponent } from '@shared/components/auth-social-buttons.component';
import { InputComponent } from '@shared/components/input.component';
import { SubmitButtonComponent } from '@shared/components/submit-button.component';
import {
    clearFieldFromErrors,
    resolveFieldError,
    shouldShowFieldError,
} from '@utils/form-display.util';
import { safeValidate, signInSchema } from '@utils/validators';
import { from, switchMap } from 'rxjs';

@Component({
    selector: 'app-signin',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        FormField,
        InputComponent,
        SubmitButtonComponent,
        AuthCardComponent,
        AuthSocialButtonsComponent,
    ],
    template: `
        <app-auth-card
            title="Login to your account"
            description="Enter your email below to login to your account"
        >
            <app-auth-social-buttons action="signin" />

            <div class="auth-divider" aria-hidden="true">
                <span>Or continue with</span>
            </div>

            <form (submit)="onSubmit($event)" class="auth-form">
                <app-input
                    id="email"
                    type="email"
                    label="Email"
                    placeholder="m@example.com"
                    [formField]="form.email"
                    [required]="true"
                    [error]="fieldError('email')"
                    (valueChange)="onFieldInput('email')"
                />

                <div class="auth-password-field">
                    <div class="auth-field-row">
                        <label for="password" class="form-label">
                            Password
                            <span class="form-label-required" aria-hidden="true">*</span>
                        </label>
                        <a routerLink="/auth/forgot-password" class="auth-field-link"
                            >Forgot your password?</a
                        >
                    </div>
                    <app-input
                        id="password"
                        type="password"
                        label=""
                        placeholder="Enter your password"
                        [formField]="form.password"
                        [error]="fieldError('password')"
                        (valueChange)="onFieldInput('password')"
                    />
                </div>

                <label class="checkbox-label" for="remember-device">
                    <input
                        id="remember-device"
                        type="checkbox"
                        class="checkbox"
                        [checked]="rememberMe()"
                        (change)="onRememberChange($event)"
                    />
                    <span>Remember this device</span>
                </label>

                <app-submit-button
                    label="Login"
                    loadingLabel="Signing in..."
                    [loading]="auth.isLoading()"
                />
            </form>

            <p authCardFooter class="auth-card-footer">
                Don't have an account?
                <a routerLink="/auth/signup">Sign up</a>
            </p>
        </app-auth-card>
    `,
})
export class SignInComponent {
    readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);

    private readonly model = signal({ email: '', password: '', rememberMe: false });
    readonly rememberMe = signal(false);
    readonly submitted = signal(false);
    readonly zodErrors = signal<Record<string, string[]>>({});

    readonly form = form(
        this.model,
        schema((f) => {
            required(f.email, { message: 'Email is required' });
            required(f.password, { message: 'Password is required' });
        }),
    );

    fieldError(name: 'email' | 'password'): string | null {
        const field = this.form[name]();
        const show = shouldShowFieldError({
            touched: field.touched(),
            submitted: this.submitted(),
        });
        return resolveFieldError(
            this.zodErrors()[name]?.[0] ?? field.errors()[0]?.message,
            show,
        );
    }

    onFieldInput(name: 'email' | 'password'): void {
        this.zodErrors.update((errors) => clearFieldFromErrors(errors, name));
    }

    onRememberChange(event: Event): void {
        this.rememberMe.set((event.target as HTMLInputElement).checked);
    }

    onSubmit(event: Event): void {
        event.preventDefault();
        this.submitted.set(true);

        const validation = safeValidate(signInSchema, this.model());
        if (!validation.success) {
            this.zodErrors.set(validation.errors ?? {});
            return;
        }
        this.zodErrors.set({});

        this.auth
            .signIn({ ...this.model(), rememberMe: this.rememberMe() })
            .pipe(
                switchMap(() => {
                    const mustChange = this.auth.mustChangePassword();
                    return from(
                        this.router.navigate(mustChange ? ['/dashboard/settings'] : ['/dashboard'], {
                            queryParams: mustChange ? { tab: 'security', forcePassword: '1' } : undefined,
                        }),
                    );
                }),
            )
            .subscribe({
                error: () => {
                    const message = this.auth.error();
                    if (message) {
                        this.toast.error('Sign in failed', message);
                        this.auth.clearError();
                    }
                },
            });
    }
}

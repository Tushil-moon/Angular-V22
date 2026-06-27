/**
 * Sign In Page Component — Signal Forms (Angular v22)
 */

import { Component, inject, signal } from '@angular/core';
import { form, FormField, required, schema, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@services/index';
import { ToastService } from '@services/toast.service';
import { AuthCardComponent } from '@shared/components/auth-card.component';
import { AuthSocialButtonsComponent } from '@shared/components/auth-social-buttons.component';
import { CheckboxComponent } from '@shared/components/checkbox.component';
import { InputComponent } from '@shared/components/input.component';
import { SubmitButtonComponent } from '@shared/components/submit-button.component';
import {
    clearFieldFromErrors,
    resolveFieldError,
    shouldShowFieldError,
} from '@utils/form-display.util';
import { safeValidate, signInSchema } from '@utils/validators';

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

                <div class="form-group">
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

                <app-checkbox id="remember-device" label="Remember this device" />

                <app-submit-button
                    label="Login"
                    loadingLabel="Signing in..."
                    [loading]="authService.isLoading()"
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
    authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly toastService = inject(ToastService);

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

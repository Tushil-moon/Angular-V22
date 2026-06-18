/**
 * Forgot Password Page
 */

import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@services/index';
import { ToastService } from '@services/toast.service';
import { AlertComponent } from '@shared/components/alert.component';
import { AuthCardComponent } from '@shared/components/auth-card.component';
import { InputComponent } from '@shared/components/input.component';
import { SubmitButtonComponent } from '@shared/components/submit-button.component';
import {
    addTouchedField,
    clearFieldFromErrors,
    resolveFieldError,
    shouldShowFieldError,
} from '@utils/form-display.util';
import { forgotPasswordSchema, safeValidate } from '@utils/validators';

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
            title="Forgot your password"
            description="Enter your email address and we'll send you a link to reset your password"
        >
            @if (success()) {
                <app-alert
                    type="success"
                    title="Check your email"
                    message="If an account exists for that address, reset instructions have been sent."
                />
            } @else {
                <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
                    <app-input
                        id="email"
                        type="email"
                        label="Email"
                        placeholder="m@example.com"
                        formControlName="email"
                        [required]="true"
                        [error]="fieldError('email')"
                        (blurred)="onFieldBlur('email')"
                        (valueChange)="onFieldInput('email')"
                    />

                    <app-submit-button
                        label="Send reset link"
                        loadingLabel="Sending..."
                        [loading]="authService.isLoading()"
                    />
                </form>
            }

            <p authCardFooter class="auth-card-footer">
                <a routerLink="/auth/signin">Back to login</a>
            </p>
        </app-auth-card>
    `,
})
export class ForgotPasswordComponent {
    authService = inject(AuthService);
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly toastService = inject(ToastService);

    form = this.fb.group({
        email: ['', Validators.required],
    });

    validationErrors = signal<Record<string, string[]>>({});
    readonly submitted = signal(false);
    readonly touchedFields = signal<Set<string>>(new Set());
    success = signal(false);

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

        try {
            await this.authService.requestPasswordReset(validation.data.email);
            this.success.set(true);
        } catch (err: unknown) {
            const message =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as { message: string }).message)
                    : 'Unable to send reset email.';
            this.toastService.error('Request failed', message);
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

/**
 * Sign Up Page Component
 */

import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@services/index';
import { ToastService } from '@services/toast.service';
import { AuthCardComponent } from '@shared/components/auth-card.component';
import { AuthSocialButtonsComponent } from '@shared/components/auth-social-buttons.component';
import { InputComponent } from '@shared/components/input.component';
import { SubmitButtonComponent } from '@shared/components/submit-button.component';
import { SIGN_UP_FIELDS, SIGN_UP_NAME_FIELDS } from '@shared/config/auth-form.config';
import {
    addTouchedField,
    clearFieldFromErrors,
    resolveFieldError,
    shouldShowFieldError,
} from '@utils/form-display.util';
import { safeValidate, signUpSchema } from '@utils/validators';

@Component({
    selector: 'app-signup',
    imports: [
        RouterLink,
        ReactiveFormsModule,
        InputComponent,
        SubmitButtonComponent,
        AuthCardComponent,
        AuthSocialButtonsComponent,
    ],
    template: `
        <app-auth-card
            title="Create an account"
            description="Enter your information below to create your account"
        >
            <app-auth-social-buttons action="signup" />

            <div class="auth-divider" aria-hidden="true">
                <span>Or continue with</span>
            </div>

            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    @for (field of nameFields; track field.name) {
                        <app-input
                            [id]="field.name"
                            [type]="field.type"
                            [label]="field.label"
                            [placeholder]="field.placeholder"
                            [formControlName]="field.name"
                            [error]="getFieldError(field.name)"
                            (blurred)="onFieldBlur(field.name)"
                            (valueChange)="onFieldInput(field.name)"
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
                        [required]="field.required ?? false"
                        [error]="getFieldError(field.name)"
                        (blurred)="onFieldBlur(field.name)"
                        (valueChange)="onFieldInput(field.name)"
                    />
                }

                <app-submit-button
                    label="Create account"
                    loadingLabel="Creating account..."
                    [loading]="authService.isLoading()"
                />
            </form>

            <p authCardFooter class="auth-card-footer">
                Already have an account?
                <a routerLink="/auth/signin">Sign in</a>
            </p>
        </app-auth-card>
    `,
})
export class SignUpComponent {
    authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly toastService = inject(ToastService);
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
    readonly submitted = signal(false);
    readonly touchedFields = signal<Set<string>>(new Set());

    onFieldBlur(field: string): void {
        this.touchedFields.update((set) => addTouchedField(set, field));
    }

    onFieldInput(field: string): void {
        this.validationErrors.update((errors) => clearFieldFromErrors(errors, field));
    }

    async onSubmit(): Promise<void> {
        this.submitted.set(true);

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
        } catch {
            const message = this.authService.error();
            if (message) {
                this.toastService.error('Sign up failed', message);
                this.authService.clearError();
            }
        }
    }

    getFieldError(field: string): string | null {
        const show = shouldShowFieldError({
            touched: this.touchedFields().has(field),
            submitted: this.submitted(),
        });
        return resolveFieldError(this.validationErrors()[field]?.[0], show);
    }
}

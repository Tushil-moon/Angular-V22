/**
 * Settings — Profile / Security tabs (change password)
 */

import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    AlertComponent,
    InputComponent,
    SubmitButtonComponent,
    TabsComponent,
    TabsContentComponent,
    TabsListComponent,
    TabsTriggerComponent,
} from '@shared/components';
import {
    addTouchedField,
    clearFieldFromErrors,
    resolveFieldError,
    shouldShowFieldError,
} from '@utils/form-display.util';
import { changePasswordSchema, safeValidate } from '@utils/validators';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-settings',
    imports: [
        ReactiveFormsModule,
        AlertComponent,
        InputComponent,
        SubmitButtonComponent,
        TabsComponent,
        TabsListComponent,
        TabsTriggerComponent,
        TabsContentComponent,
    ],
    template: `
        <div class="index-page">
            <div class="index-header">
                <div class="index-header-copy">
                    <h1 class="index-title">Settings</h1>
                    <p class="index-subtitle">Manage your profile and account security</p>
                </div>
            </div>

            @if (forcePassword()) {
                <app-alert
                    class="mb-4"
                    type="warning"
                    title="Password change required"
                    message="You must update your password before continuing."
                />
            }

            <section class="index-card p-4 sm:p-6">
                <app-tabs [(value)]="activeTab">
                    <app-tabs-list>
                        <app-tabs-trigger value="profile">Profile</app-tabs-trigger>
                        <app-tabs-trigger value="security">Security</app-tabs-trigger>
                    </app-tabs-list>

                    <app-tabs-content value="profile">
                        <div class="mt-4 space-y-3 text-sm">
                            <div>
                                <p class="index-cell-muted">Name</p>
                                <p class="index-cell-primary font-medium">{{ displayName() }}</p>
                            </div>
                            <div>
                                <p class="index-cell-muted">Email</p>
                                <p class="index-cell-primary font-medium">{{ userEmail() }}</p>
                            </div>
                        </div>
                    </app-tabs-content>

                    <app-tabs-content value="security">
                        <div class="mt-4">
                            <h2 class="om-list-title">Change password</h2>
                            <p class="index-subtitle mt-1">
                                Choose a strong password you have not used elsewhere.
                            </p>
                            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form mt-4 max-w-md">
                                <app-input
                                    id="currentPassword"
                                    type="password"
                                    label="Current password"
                                    placeholder="Enter current password"
                                    formControlName="currentPassword"
                                    [required]="true"
                                    [error]="fieldError('currentPassword')"
                                    (blurred)="onFieldBlur('currentPassword')"
                                    (valueChange)="onFieldInput('currentPassword')"
                                />
                                <app-input
                                    id="newPassword"
                                    type="password"
                                    label="New password"
                                    placeholder="Enter new password"
                                    formControlName="newPassword"
                                    [required]="true"
                                    [error]="fieldError('newPassword')"
                                    (blurred)="onFieldBlur('newPassword')"
                                    (valueChange)="onFieldInput('newPassword')"
                                />
                                <app-input
                                    id="confirmPassword"
                                    type="password"
                                    label="Confirm password"
                                    placeholder="Confirm new password"
                                    formControlName="confirmPassword"
                                    [required]="true"
                                    [error]="fieldError('confirmPassword')"
                                    (blurred)="onFieldBlur('confirmPassword')"
                                    (valueChange)="onFieldInput('confirmPassword')"
                                />

                                <app-submit-button
                                    label="Update password"
                                    loadingLabel="Updating..."
                                    [loading]="auth.isLoading()"
                                />
                            </form>
                        </div>
                    </app-tabs-content>
                </app-tabs>
            </section>
        </div>
    `,
})
export class SettingsComponent {
    readonly auth = inject(AuthService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly destroyRef = inject(DestroyRef);

    readonly activeTab = signal(
        this.route.snapshot.queryParamMap.get('tab') === 'security' ? 'security' : 'profile',
    );
    readonly forcePassword = signal(
        this.route.snapshot.queryParamMap.get('forcePassword') === '1',
    );

    readonly displayName = computed(() => {
        const user = this.auth.currentUser();
        if (user?.firstName) return `${user.firstName} ${user.lastName ?? ''}`.trim();
        if (user?.email) return user.email.split('@')[0] ?? user.email;
        return 'User';
    });

    readonly userEmail = computed(() => this.auth.currentUser()?.email ?? '');

    form = this.fb.group({
        currentPassword: ['', Validators.required],
        newPassword: ['', Validators.required],
        confirmPassword: ['', Validators.required],
    });

    validationErrors = signal<Record<string, string[]>>({});
    readonly submitted = signal(false);
    readonly touchedFields = signal<Set<string>>(new Set());

    private readonly syncQueryParams = (() => {
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const tab = params.get('tab');
            if (tab === 'security' || tab === 'profile') {
                this.activeTab.set(tab);
            }
            this.forcePassword.set(params.get('forcePassword') === '1');
        });
    })();

    onFieldBlur(field: string): void {
        this.touchedFields.update((set) => addTouchedField(set, field));
    }

    onFieldInput(field: string): void {
        this.validationErrors.update((errors) => clearFieldFromErrors(errors, field));
    }

    fieldError(field: 'currentPassword' | 'newPassword' | 'confirmPassword'): string | null {
        const show = shouldShowFieldError({
            touched: this.touchedFields().has(field),
            submitted: this.submitted(),
        });
        const zodError = this.validationErrors()[field]?.[0];
        return resolveFieldError(zodError, show);
    }

    onSubmit(): void {
        this.submitted.set(true);

        const validation = safeValidate(changePasswordSchema, this.form.getRawValue());
        if (!validation.success) {
            this.validationErrors.set(validation.errors ?? {});
            return;
        }

        this.validationErrors.set({});
        const { currentPassword, newPassword } = validation.data;

        this.auth.changePassword(currentPassword, newPassword).subscribe({
            next: () => {
                this.toast.success('Password updated');
                this.form.reset();
                this.submitted.set(false);
                this.touchedFields.set(new Set());
                this.forcePassword.set(false);
                this.router.navigate([], {
                    relativeTo: this.route,
                    queryParams: { tab: 'security' },
                    replaceUrl: true,
                });
            },
            error: (error: unknown) => {
                const message =
                    error && typeof error === 'object' && 'message' in error
                        ? String((error as { message: string }).message)
                        : 'Failed to change password.';
                this.toast.error(message);
            },
        });
    }
}

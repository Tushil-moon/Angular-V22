/**
 * Email Verification Page
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '@services/index';
import { ToastService } from '@services/toast.service';
import { AuthCardComponent } from '@shared/components/auth-card.component';
import { LoaderComponent } from '@shared/components/loader.component';
import { ignorePromise } from '@utils/form-display.util';

@Component({
    selector: 'app-verify-email',
    imports: [AuthCardComponent, LoaderComponent, RouterLink],
    template: `
        <app-auth-card title="Email verification" description="Confirming your account address">
            <div class="auth-status-body">
                @if (isLoading()) {
                    <app-loader />
                    <p class="text-sm text-muted-foreground">Verifying your email...</p>
                } @else if (error()) {
                    <p class="text-sm text-destructive">{{ error() }}</p>
                    <div class="auth-status-actions">
                        <a routerLink="/auth/signin" class="btn btn-outline btn-sm">Sign in</a>
                    </div>
                } @else {
                    <p class="text-lg font-medium text-foreground">Email verified</p>
                    <p class="text-sm text-muted-foreground">
                        Your email address has been confirmed.
                    </p>
                    <div class="auth-status-actions">
                        <a routerLink="/dashboard" class="btn btn-primary btn-sm">Go to dashboard</a>
                    </div>
                }
            </div>
        </app-auth-card>
    `,
})
export class VerifyEmailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly authService = inject(AuthService);
    private readonly toastService = inject(ToastService);

    isLoading = signal(true);
    error = signal<string | null>(null);

    ngOnInit(): void {
        ignorePromise(this.verify());
    }

    async verify(): Promise<void> {
        const token = this.route.snapshot.queryParamMap.get('token');
        if (!token) {
            this.error.set('Invalid verification link.');
            this.isLoading.set(false);
            return;
        }

        try {
            await this.authService.verifyEmail(token);
            this.toastService.success('Email verified', 'Your account is confirmed.');
        } catch {
            this.error.set('Verification link is invalid or expired.');
        } finally {
            this.isLoading.set(false);
        }
    }
}

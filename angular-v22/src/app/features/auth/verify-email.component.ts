/**
 * Email Verification Page
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '@services/index';
import { ToastService } from '@services/toast.service';
import { ButtonComponent, CardBodyComponent, CardComponent, LoaderComponent } from '@shared/components';
import { ignorePromise } from '@utils/form-display.util';

@Component({
    selector: 'app-verify-email',
    imports: [CardComponent, CardBodyComponent, ButtonComponent, LoaderComponent, RouterLink],
    template: `
        <div class="flex min-h-screen items-center justify-center p-4">
            <app-card class="w-full max-w-md">
                <app-card-body contentClass="space-y-4 text-center py-8">
                    @if (isLoading()) {
                        <app-loader />
                        <p class="text-sm text-muted-foreground">Verifying your email...</p>
                    } @else if (error()) {
                        <p class="text-sm text-destructive">{{ error() }}</p>
                        <a routerLink="/auth/signin" class="btn btn-outline btn-sm">Sign in</a>
                    } @else {
                        <p class="text-lg font-medium">Email verified</p>
                        <p class="text-sm text-muted-foreground">
                            Your email address has been confirmed.
                        </p>
                        <a routerLink="/dashboard" class="btn btn-primary btn-sm">Go to dashboard</a>
                    }
                </app-card-body>
            </app-card>
        </div>
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

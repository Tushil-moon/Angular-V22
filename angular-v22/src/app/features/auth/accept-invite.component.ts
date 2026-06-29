/**
 * Accept Invite Page
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, OrganizationService } from '@services/index';
import { ToastService } from '@services/toast.service';
import { ButtonComponent, CardBodyComponent, CardComponent, LoaderComponent } from '@shared/components';
import { ignorePromise } from '@utils/form-display.util';

@Component({
    selector: 'app-accept-invite',
    imports: [CardComponent, CardBodyComponent, ButtonComponent, LoaderComponent],
    template: `
        <div class="flex min-h-screen items-center justify-center p-4">
            <app-card class="w-full max-w-md">
                <app-card-body contentClass="space-y-4 text-center py-8">
                    @if (isLoading()) {
                        <app-loader />
                        <p class="text-sm text-muted-foreground">Accepting invite...</p>
                    } @else if (error()) {
                        <p class="text-sm text-destructive">{{ error() }}</p>
                        <app-button type="button" (clicked)="goToSignIn()">Go to sign in</app-button>
                    } @else if (organizationName()) {
                        <p class="text-lg font-medium">Welcome to {{ organizationName() }}</p>
                        <p class="text-sm text-muted-foreground">
                            Your invite was accepted. You can now access the workspace.
                        </p>
                        <app-button (clicked)="goToDashboard()">Open dashboard</app-button>
                    }
                </app-card-body>
            </app-card>
        </div>
    `,
})
export class AcceptInviteComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);
    private readonly organizationService = inject(OrganizationService);
    private readonly toastService = inject(ToastService);

    isLoading = signal(true);
    error = signal<string | null>(null);
    organizationName = signal<string | null>(null);

    ngOnInit(): void {
        ignorePromise(this.accept());
    }

    async accept(): Promise<void> {
        const token = this.route.snapshot.queryParamMap.get('token');
        if (!token) {
            this.error.set('Invalid invite link.');
            this.isLoading.set(false);
            return;
        }

        if (!this.authService.isAuthenticated()) {
            this.error.set('Please sign in first, then open the invite link again.');
            this.isLoading.set(false);
            ignorePromise(this.router.navigate(['/auth/signin']));
            return;
        }

        try {
            const org = await this.organizationService.acceptInvite(token);
            this.organizationName.set(org?.name ?? 'your workspace');
            this.toastService.success('Invite accepted', 'You have joined the organization.');
        } catch {
            this.error.set('Invite not found or expired.');
        } finally {
            this.isLoading.set(false);
        }
    }

    goToDashboard(): void {
        ignorePromise(this.router.navigate(['/dashboard']));
    }

    goToSignIn(): void {
        ignorePromise(this.router.navigate(['/auth/signin']));
    }
}

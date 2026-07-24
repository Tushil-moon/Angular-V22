/**
 * Dashboard Home — shell placeholder for UI work
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '@services/auth.service';
import {
    CardBodyComponent,
    CardComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
} from '@shared/components';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-dashboard-home',
    imports: [
        CardComponent,
        CardHeaderComponent,
        CardTitleComponent,
        CardDescriptionComponent,
        CardBodyComponent,
    ],
    template: `
        <div class="page-shell dashboard-home">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">Welcome back, {{ displayName() }}</h1>
                    <p class="page-description">
                        Feature modules are paused while we refine the UI shell.
                    </p>
                </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
                <app-card>
                    <app-card-header>
                        <app-card-title>Workspace shell</app-card-title>
                        <app-card-description>
                            Auth, layout, and theme toggle are active.
                        </app-card-description>
                    </app-card-header>
                    <app-card-body>
                        <p class="text-sm text-muted-foreground">
                            Reusable components (dialogs, cards, tables, dropdowns) remain available
                            for UI fixes. Feature APIs and pages will be restored after the shell is
                            polished.
                        </p>
                    </app-card-body>
                </app-card>

                <app-card>
                    <app-card-header>
                        <app-card-title>Theme</app-card-title>
                        <app-card-description>
                            Use the header theme toggle to switch light and dark mode.
                        </app-card-description>
                    </app-card-header>
                    <app-card-body>
                        <p class="text-sm text-muted-foreground">
                            Signed in as {{ userEmail() }}.
                        </p>
                    </app-card-body>
                </app-card>
            </div>
        </div>
    `,
})
export class DashboardHomeComponent {
    private readonly authService = inject(AuthService);

    readonly displayName = computed(() => {
        const user = this.authService.currentUser();
        if (user?.firstName) return `${user.firstName} ${user.lastName ?? ''}`.trim();
        if (user?.email) return user.email.split('@')[0];
        return 'User';
    });

    readonly userEmail = computed(() => this.authService.currentUser()?.email ?? '');
}

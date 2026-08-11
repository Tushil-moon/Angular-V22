/**
 * Coming Soon — reusable placeholder for unfinished ecommerce modules
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
    CardBodyComponent,
    CardComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
} from '@shared/components';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-coming-soon',
    imports: [
        CardComponent,
        CardHeaderComponent,
        CardTitleComponent,
        CardDescriptionComponent,
        CardBodyComponent,
    ],
    template: `
        <div class="page-shell">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">{{ title() }}</h1>
                    <p class="page-description">{{ description() }}</p>
                </div>
            </div>

            <app-card>
                <app-card-header>
                    <app-card-title>Coming soon</app-card-title>
                    <app-card-description>
                        This module is planned for a later phase of the e-commerce admin.
                    </app-card-description>
                </app-card-header>
                <app-card-body>
                    <p class="text-sm text-muted-foreground">
                        Navigation is wired so you can explore the shell. Feature APIs and screens
                        will land here next.
                    </p>
                </app-card-body>
            </app-card>
        </div>
    `,
})
export class ComingSoonComponent {
    private readonly route = inject(ActivatedRoute);

    readonly title = computed(
        () => (this.route.snapshot.data['title'] as string | undefined) ?? 'Coming soon',
    );

    readonly description = computed(
        () =>
            (this.route.snapshot.data['description'] as string | undefined) ??
            'This section is not implemented yet.',
    );
}

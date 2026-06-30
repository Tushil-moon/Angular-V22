/**
 * Auth card shell — shadcn/ui login-01 block pattern
 */

import { Component, input } from '@angular/core';

import { AuthPageHeaderComponent } from './auth-page-header.component';
import { CardBodyComponent, CardComponent } from './card.component';

@Component({
    selector: 'app-auth-card',
    imports: [CardComponent, CardBodyComponent, AuthPageHeaderComponent],
    template: `
        <div class="auth-card-inner">
            <app-card>
                <app-auth-page-header [title]="title()" [description]="description()" />
                <app-card-body contentClass="auth-card-stack" [flush]="true">
                    <ng-content />
                </app-card-body>
                <ng-content select="[authCardFooter]" />
            </app-card>
        </div>
    `,
})
export class AuthCardComponent {
    title = input.required<string>();
    description = input('');
}

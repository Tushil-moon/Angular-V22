/**
 * Auth card shell — Shadcn Space login/register/forgot templates
 */

import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from './icon.component';
import { CardComponent, CardBodyComponent } from './card.component';
import { AuthPageHeaderComponent } from './auth-page-header.component';

@Component({
  selector: 'app-auth-card',
  imports: [
    RouterLink,
    IconComponent,
    CardComponent,
    CardBodyComponent,
    AuthPageHeaderComponent,
  ],
  template: `
    <app-card>
      <app-card-body contentClass="auth-card-body">
        <div class="auth-card-inner">
          <a routerLink="/auth/signin" class="auth-card-brand" aria-label="Angular V22 home">
            <div class="auth-brand-logo" aria-hidden="true">
              <app-icon name="layout-dashboard" [size]="20" />
            </div>
          </a>

          <app-auth-page-header [title]="title()" [description]="description()" />

          <ng-content />
        </div>
      </app-card-body>
    </app-card>
  `,
})
export class AuthCardComponent {
  title = input.required<string>();
  description = input('');
}

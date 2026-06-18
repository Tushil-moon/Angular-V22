/**
 * Auth page title block — Shadcn Space / shadcn authentication blocks
 */

import { Component, input } from '@angular/core';

@Component({
  selector: 'app-auth-page-header',
  template: `
    <div class="auth-page-header">
      <h1 class="auth-page-title">{{ title() }}</h1>
      @if (description()) {
        <p class="auth-page-description">{{ description() }}</p>
      }
    </div>
  `,
})
export class AuthPageHeaderComponent {
  title = input.required<string>();
  description = input('');
}

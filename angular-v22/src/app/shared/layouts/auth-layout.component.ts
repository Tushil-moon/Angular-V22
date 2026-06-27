import { Component, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeToggleComponent } from '../components/theme-toggle.component';

@Component({
    selector: 'app-auth-layout',
    imports: [RouterOutlet, ThemeToggleComponent],
    template: `
        <div class="auth-shell">
            <div class="auth-shell-theme">
                <app-theme-toggle />
            </div>
            <div class="auth-shell-content">
                <router-outlet />
            </div>
        </div>
    `,
    styleUrl: './auth-layout.component.scss',
    encapsulation: ViewEncapsulation.None,
})
export class AuthLayoutComponent {}

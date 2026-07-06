import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
    ApplicationConfig,
    inject,
    provideAppInitializer,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { apiInterceptor } from '@services/http/api.interceptor';
import { ThemeService } from '@services/theme.service';
import { provideAppIconConfig, provideAppIcons } from '@shared/icons';
import { provideQuillConfig } from 'ngx-quill/config';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
        provideAppIconConfig(),
        provideAppIcons(),
        provideQuillConfig({
            theme: 'snow',
            format: 'html',
            sanitize: true,
        }),
        provideAppInitializer(() => {
            inject(ThemeService).init();
        }),
    ],
};

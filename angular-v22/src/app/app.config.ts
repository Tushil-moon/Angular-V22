import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
    APP_INITIALIZER,
    ApplicationConfig,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { PreloadAllModules, provideRouter, withInMemoryScrolling, withPreloading } from '@angular/router';
import { apiInterceptor } from '@services/http/api.interceptor';
import { ThemeService } from '@services/theme.service';
import { provideAppIconConfig, provideAppIcons } from '@shared/icons';
import { provideQuillConfig } from 'ngx-quill/config';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideRouter(
            routes,
            withPreloading(PreloadAllModules),
            withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
        ),
        provideAppIconConfig(),
        provideAppIcons(),
        provideQuillConfig({
            theme: 'snow',
            format: 'html',
            sanitize: true,
        }),
        {
            provide: APP_INITIALIZER,
            useFactory: (themeService: ThemeService) => () => themeService.init(),
            deps: [ThemeService],
            multi: true,
        },
    ],
};

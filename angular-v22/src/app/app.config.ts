import {
    APP_INITIALIZER,
    ApplicationConfig,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling, withPreloading, PreloadAllModules } from '@angular/router';
import { ThemeService } from '@services/theme.service';
import { provideQuillConfig } from 'ngx-quill/config';
import { provideAppIconConfig, provideAppIcons } from '@shared/icons';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
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

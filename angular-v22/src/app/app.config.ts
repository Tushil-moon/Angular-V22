import {
    APP_INITIALIZER,
    ApplicationConfig,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling, withPreloading, PreloadAllModules } from '@angular/router';
import { ThemeService } from '@services/theme.service';
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
        {
            provide: APP_INITIALIZER,
            useFactory: (themeService: ThemeService) => () => themeService.init(),
            deps: [ThemeService],
            multi: true,
        },
    ],
};

import { Injectable, Injector } from '@angular/core';
import { ignorePromise } from '@utils/form-display.util';

@Injectable({
    providedIn: 'root',
})
export class HttpUnauthorizedRegistry {
    private handler: (() => void) | null = null;

    register(handler: () => void): void {
        this.handler = handler;
    }

    handleUnauthorized(injector: Injector): void {
        if (this.handler) {
            this.handler();
            return;
        }

        ignorePromise(
            import('../auth.service').then(({ AuthService }) => {
                injector.get(AuthService).handleUnauthorized();
            }),
        );
    }
}

import { ComponentType, Overlay, OverlayConfig } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { inject, Injectable, Injector, NgZone } from '@angular/core';
import { DIALOG_CLOSE, DIALOG_CONFIG, DIALOG_DATA } from '@shared/dialog/dialog.tokens';
import type { DialogConfig } from '@shared/dialog/dialog.types';
import { DialogRef } from '@shared/dialog/dialog-ref';

@Injectable({
    providedIn: 'root',
})
export class DialogService {
    private readonly overlay = inject(Overlay);
    private readonly injector = inject(Injector);
    private readonly ngZone = inject(NgZone);

    private readonly openRefs = new Set<DialogRef<unknown, unknown>>();
    private activeRef: DialogRef<unknown, unknown> | null = null;

    hasOpen(): boolean {
        return this.activeRef !== null;
    }

    async openLazy<T, D = unknown, R = unknown>(
        loader: () => Promise<ComponentType<T>>,
        config: DialogConfig<D> = {},
    ): Promise<DialogRef<T, R>> {
        const component = await loader();
        return this.open(component, config);
    }

    open<T, D = unknown, R = unknown>(
        component: ComponentType<T>,
        config: DialogConfig<D> = {},
    ): DialogRef<T, R> {
        if (this.activeRef) {
            return this.activeRef as DialogRef<T, R>;
        }

        const overlayRef = this.overlay.create(this.buildOverlayConfig(config));
        const dialogRef = new DialogRef<T, R>(overlayRef);
        const closeDialog = () => dialogRef.close();

        const portalInjector = Injector.create({
            parent: this.injector,
            providers: [
                { provide: DialogRef, useValue: dialogRef },
                { provide: DIALOG_CLOSE, useValue: closeDialog },
                { provide: DIALOG_DATA, useValue: config.data },
                { provide: DIALOG_CONFIG, useValue: config },
            ],
        });

        const portal = new ComponentPortal(component, null, portalInjector);
        const componentRef = overlayRef.attach(portal);
        dialogRef.componentInstance = componentRef.instance;

        this.activeRef = dialogRef as DialogRef<unknown, unknown>;
        this.openRefs.add(dialogRef as DialogRef<unknown, unknown>);

        overlayRef.detachments().subscribe(() => {
            this.openRefs.delete(dialogRef as DialogRef<unknown, unknown>);
            if (this.activeRef === dialogRef) {
                this.activeRef = null;
            }
        });

        if (config.closeOnBackdrop !== false) {
            overlayRef.backdropClick().subscribe(() => {
                this.ngZone.run(() => closeDialog());
            });
        }

        if (config.closeOnEscape !== false) {
            overlayRef.keydownEvents().subscribe((event) => {
                if (event.key === 'Escape') {
                    this.ngZone.run(() => closeDialog());
                }
            });
        }

        return dialogRef;
    }

    closeAll(): void {
        [...this.openRefs].forEach((ref) => ref.close());
        this.activeRef = null;
    }

    private buildOverlayConfig<D>(config: DialogConfig<D>): OverlayConfig {
        const panelClass = ['dialog-overlay-pane', ...this.normalizeClasses(config.panelClass)];

        const overlayConfig: OverlayConfig = {
            hasBackdrop: true,
            backdropClass: 'dialog-backdrop',
            panelClass,
            positionStrategy: this.overlay.position().global().top('0').left('0'),
            scrollStrategy: this.overlay.scrollStrategies.block(),
        };

        if (config.width) {
            overlayConfig.width = config.width;
        }

        if (config.maxWidth) {
            overlayConfig.maxWidth = config.maxWidth;
        }

        return overlayConfig;
    }

    private normalizeClasses(panelClass?: string | string[]): string[] {
        if (!panelClass) return [];
        return Array.isArray(panelClass) ? panelClass : [panelClass];
    }
}

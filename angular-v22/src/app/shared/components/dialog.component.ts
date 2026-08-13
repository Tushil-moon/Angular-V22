/**
 * Dialog Component — shadcn-style modal panel (rendered inside CDK overlay)
 */

import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import { DIALOG_CLOSE } from '@shared/dialog/dialog.tokens';
import { DialogRef } from '@shared/dialog/dialog-ref';

import { IconComponent } from './icon.component';
import type { IconName } from '@shared/icons';

export type DialogSize = 'sm' | 'default' | 'lg' | 'xl' | '2xl';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-dialog',
    host: {
        class: 'block w-full min-h-0 max-h-full',
    },
    imports: [A11yModule, IconComponent],
    template: `
        <div
            [class]="panelClasses()"
            role="dialog"
            aria-modal="true"
            [attr.aria-labelledby]="titleId"
            [attr.aria-describedby]="description() ? descriptionId : null"
            cdkTrapFocus
            cdkTrapFocusAutoCapture
        >
            <button type="button" class="dialog-close" (click)="close()" aria-label="Close">
                <app-icon name="x" [size]="16" />
            </button>

            <div class="dialog-header">
                <div class="dialog-header-row">
                    <div class="dialog-header-main">
                        @if (titleIcon()) {
                            <div class="dialog-title-icon" aria-hidden="true">
                                <app-icon [name]="titleIcon()!" [size]="20" />
                            </div>
                        }
                        <div class="dialog-header-copy">
                            <h2 class="dialog-title" [id]="titleId">{{ title() }}</h2>
                            @if (description()) {
                                <p class="dialog-description" [id]="descriptionId">
                                    {{ description() }}
                                </p>
                            }
                        </div>
                    </div>
                    <ng-content select="[dialogHeaderExtra]" />
                </div>
            </div>

            <div class="dialog-body">
                <div class="dialog-body-inner">
                    <ng-content></ng-content>
                </div>
            </div>

            @if (showFooter()) {
                <div class="dialog-footer">
                    <ng-content select="[dialogFooter]"></ng-content>
                </div>
            }
        </div>
    `,
})
export class DialogComponent {
    private readonly dialogRef = inject(DialogRef, { optional: true });
    private readonly closeDialog = inject(DIALOG_CLOSE, { optional: true });

    readonly titleId = `dialog-title-${Math.random().toString(36).slice(2, 9)}`;
    readonly descriptionId = `dialog-description-${Math.random().toString(36).slice(2, 9)}`;

    title = input('Dialog');
    description = input('');
    titleIcon = input<IconName | null>(null);
    size = input<DialogSize>('default');
    extraPanelClass = input('', { alias: 'panelClass' });
    showFooter = input(true);

    panelClasses = computed(() => {
        const sizeClasses: Record<DialogSize, string> = {
            sm: 'dialog-panel-sm',
            default: 'dialog-panel-md',
            lg: 'dialog-panel-lg',
            xl: 'dialog-panel-xl',
            '2xl': 'dialog-panel-2xl',
        };
        const sizeClass = sizeClasses[this.size()];
        const extra = this.extraPanelClass();
        return ['dialog-panel', 'animate-dialogIn', sizeClass, extra].filter(Boolean).join(' ');
    });

    close(): void {
        if (this.closeDialog) {
            this.closeDialog();
            return;
        }
        this.dialogRef?.close();
    }
}

/**
 * Dialog Component — shadcn-style modal panel (rendered inside CDK overlay)
 */

import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, inject, input } from '@angular/core';
import { DialogRef } from '@shared/dialog/dialog-ref';
import { DIALOG_CLOSE } from '@shared/dialog/dialog.tokens';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-dialog',
  host: {
    class: 'block',
  },
  imports: [IconComponent],
  template: `
    <div
      class="dialog-panel animate-slideUp"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title()"
      cdkTrapFocus
      cdkTrapFocusAutoCapture
    >
      <div class="dialog-header">
        <div class="flex flex-col gap-1.5 text-left">
          <h2 class="dialog-title">{{ title() }}</h2>
          @if (description()) {
            <p class="dialog-description">{{ description() }}</p>
          }
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-icon shrink-0"
          (click)="close()"
          aria-label="Close"
        >
          <app-icon name="x" [size]="18" />
        </button>
      </div>

      <div class="dialog-body">
        <ng-content></ng-content>
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

  title = input('Dialog');
  description = input('');
  showFooter = input(true);

  close(): void {
    if (this.closeDialog) {
      this.closeDialog();
      return;
    }
    this.dialogRef?.close();
  }
}

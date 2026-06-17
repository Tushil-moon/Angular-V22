/**
 * Dialog Component — shadcn-style modal panel (rendered inside CDK overlay)
 */

import { Component, computed, inject, input } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { DialogRef } from '@shared/dialog/dialog-ref';
import { DIALOG_CLOSE } from '@shared/dialog/dialog.tokens';
import { IconComponent } from './icon.component';

export type DialogSize = 'sm' | 'default' | 'lg';

@Component({
  selector: 'app-dialog',
  host: {
    class: 'block',
  },
  imports: [A11yModule, IconComponent],
  template: `
    <div
      [class]="panelClass()"
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
        <h2 class="dialog-title" [id]="titleId">{{ title() }}</h2>
        @if (description()) {
          <p class="dialog-description" [id]="descriptionId">{{ description() }}</p>
        }
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

  readonly titleId = `dialog-title-${Math.random().toString(36).slice(2, 9)}`;
  readonly descriptionId = `dialog-description-${Math.random().toString(36).slice(2, 9)}`;

  title = input('Dialog');
  description = input('');
  size = input<DialogSize>('default');
  showFooter = input(true);

  panelClass = computed(() => {
    const sizeClass =
      this.size() === 'sm' ? 'dialog-panel-sm' : this.size() === 'lg' ? 'dialog-panel-lg' : 'dialog-panel-md';
    return `dialog-panel animate-dialogIn ${sizeClass}`;
  });

  close(): void {
    if (this.closeDialog) {
      this.closeDialog();
      return;
    }
    this.dialogRef?.close();
  }
}

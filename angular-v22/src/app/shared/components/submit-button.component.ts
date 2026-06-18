/**
 * Submit Button — form submit with loading state
 */

import { Component, input, output } from '@angular/core';
import { LoaderComponent } from './loader.component';

@Component({
  selector: 'app-submit-button',
  host: { class: 'block w-full' },
  imports: [LoaderComponent],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      class="btn btn-primary btn-full"
      (click)="clicked.emit($event)"
    >
      @if (!loading()) {
        {{ label() }}
      } @else {
        <app-loader size="sm" [inline]="true" />
        {{ loadingLabel() }}
      }
    </button>
  `,
})
export class SubmitButtonComponent {
  label = input('Submit');
  loadingLabel = input('Loading...');
  loading = input(false);
  disabled = input(false);
  type = input<'button' | 'submit' | 'reset'>('submit');

  clicked = output<MouseEvent>();
}

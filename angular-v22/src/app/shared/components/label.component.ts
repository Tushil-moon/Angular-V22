/**
 * Label — shadcn Label
 */

import { Component, input } from '@angular/core';

@Component({
  selector: 'app-label',
  template: `
    <label [for]="htmlFor()" [class]="className()">
      <ng-content />
    </label>
  `,
})
export class LabelComponent {
  htmlFor = input('');
  className = input('form-label');
}

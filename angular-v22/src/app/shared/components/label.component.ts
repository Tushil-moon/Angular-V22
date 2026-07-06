/**
 * Label — shadcn Label
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core'

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
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

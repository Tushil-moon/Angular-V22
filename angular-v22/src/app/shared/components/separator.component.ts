/**
 * Separator Component — shadcn Separator
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import { cn } from '@utils/cn';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-separator',
    template: `
        <div
            role="separator"
            [attr.aria-orientation]="orientation()"
            [class]="separatorClass()"
        ></div>
    `,
})
export class SeparatorComponent {
    orientation = input<'horizontal' | 'vertical'>('horizontal');
    className = input('');

    separatorClass = computed(() =>
        cn(
            this.orientation() === 'horizontal' ? 'separator' : 'separator-vertical',
            this.className(),
        ),
    );
}

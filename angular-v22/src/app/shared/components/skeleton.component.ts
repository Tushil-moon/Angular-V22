/**
 * Skeleton Component — shadcn-style shimmer placeholder
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core'

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-skeleton',
    host: {
        class: 'skeleton block min-w-0',
        '[class]': 'className()',
    },
    template: ``,
})
export class SkeletonComponent {
    className = input('');
}

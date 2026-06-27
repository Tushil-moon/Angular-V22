/**
 * Skeleton Component — shadcn-style shimmer placeholder
 */

import { Component, input } from '@angular/core';

@Component({
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

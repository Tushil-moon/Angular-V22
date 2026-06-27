import { Component, input } from '@angular/core';
import { CrmTag } from '@models/index';

@Component({
    selector: 'app-tag-badges',
    template: `
        @if (tags().length > 0) {
            <div class="flex flex-wrap gap-1">
                @for (tag of tags(); track tag.id) {
                    <span
                        class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        [style.background-color]="tag.color + '22'"
                        [style.color]="tag.color"
                    >
                        {{ tag.name }}
                    </span>
                }
            </div>
        }
    `,
})
export class TagBadgesComponent {
    tags = input<CrmTag[]>([]);
}

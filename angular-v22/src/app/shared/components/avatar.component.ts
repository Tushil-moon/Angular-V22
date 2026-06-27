/**
 * Avatar Component — shadcn Avatar
 */

import { Component, computed, input } from '@angular/core';
import { cn } from '@utils/cn';

@Component({
    selector: 'app-avatar',
    template: `
        <span [class]="avatarClass()" [attr.aria-label]="label() || fallback()">
            @if (src()) {
                <img [src]="src()" [alt]="label() || fallback()" class="avatar-image" />
            } @else {
                <span class="avatar-fallback">{{ fallback() }}</span>
            }
        </span>
    `,
})
export class AvatarComponent {
    src = input<string>();
    fallback = input('?');
    label = input<string>();
    size = input<'sm' | 'md' | 'lg'>('md');
    className = input('');

    avatarClass = computed(() => {
        const sizes = { sm: 'avatar-sm', md: 'avatar-md', lg: 'avatar-lg' };
        return cn('avatar', sizes[this.size()], this.className());
    });
}

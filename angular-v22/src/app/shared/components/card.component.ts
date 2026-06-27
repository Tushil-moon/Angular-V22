/**
 * Card Component — shadcn Card structure
 */

import { Component, computed, input } from '@angular/core';

@Component({
    selector: 'app-card',
    host: {
        '[class]': 'hostClass()',
    },
    template: `
        <div class="card" [class.card-fill]="fill()" [class.!gap-0]="noPadding()">
            <ng-content></ng-content>
        </div>
    `,
})
export class CardComponent {
    noPadding = input(false);
    fill = input(false);

    hostClass = computed(() =>
        this.fill() ? 'block min-w-0 flex flex-1 min-h-0 flex-col' : 'block min-w-0',
    );
}

@Component({
    selector: 'app-card-header',
    template: `
        <div class="card-header" [class.card-header-row]="row()">
            <ng-content></ng-content>
        </div>
    `,
})
export class CardHeaderComponent {
    row = input(false);
}

@Component({
    selector: 'app-card-title',
    template: `
        <h3 class="card-title">
            <ng-content></ng-content>
        </h3>
    `,
})
export class CardTitleComponent {}

@Component({
    selector: 'app-card-description',
    template: `
        <p class="card-description">
            <ng-content></ng-content>
        </p>
    `,
})
export class CardDescriptionComponent {}

@Component({
    selector: 'app-card-body',
    host: {
        class: 'min-w-0',
        '[class.block]': '!fill()',
        '[class.flex]': 'fill()',
        '[class.flex-1]': 'fill()',
        '[class.flex-col]': 'fill()',
        '[class.min-h-0]': 'fill()',
    },
    template: `
        <div [class]="contentClasses()">
            <ng-content></ng-content>
        </div>
    `,
})
export class CardBodyComponent {
    flush = input(false);
    fill = input(false);
    contentClass = input('');

    contentClasses = computed(() => {
        const classes = ['card-content'];
        if (this.flush()) classes.push('card-content-flush');
        if (this.fill()) classes.push('card-content-fill');
        const extra = this.contentClass().trim();
        if (extra) classes.push(extra);
        return classes.join(' ');
    });
}

@Component({
    selector: 'app-card-footer',
    template: `
        <div class="card-footer">
            <ng-content></ng-content>
        </div>
    `,
})
export class CardFooterComponent {}

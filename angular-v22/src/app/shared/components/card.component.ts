/**
 * Card Component — shadcn Card structure
 */

import { Component, input } from '@angular/core';

@Component({
  selector: 'app-card',
  host: { class: 'block min-w-0' },
  template: `
    <div class="card" [class.!gap-0]="noPadding()">
      <ng-content></ng-content>
    </div>
  `,
})
export class CardComponent {
  noPadding = input(false);
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
  template: `
    <div class="card-content" [class.card-content-flush]="flush()">
      <ng-content></ng-content>
    </div>
  `,
})
export class CardBodyComponent {
  flush = input(false);
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

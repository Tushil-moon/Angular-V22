/**
 * Nav Menu — reusable sidebar navigation links
 */

import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from './icon.component';
import type { NavItem } from '@shared/config/navigation.config';

@Component({
  selector: 'app-nav-menu',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <nav class="sidebar-menu">
      @for (item of items(); track item.route) {
        <a
          [routerLink]="item.disabled ? null : item.route"
          routerLinkActive="sidebar-menu-button-active"
          [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
          class="sidebar-menu-button"
          [class.pointer-events-none]="item.disabled"
          [class.opacity-50]="item.disabled"
          [attr.data-tooltip]="item.label"
          [attr.title]="collapsed() ? item.label : null"
          (click)="itemSelected.emit(item)"
        >
          <app-icon [name]="item.icon" [size]="16" [className]="iconClass()" />
          <span [class]="labelClass()">{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
})
export class NavMenuComponent {
  items = input.required<NavItem[]>();
  collapsed = input(false);
  iconClass = input('shrink-0');
  labelClass = input('sidebar-collapsible-text');

  itemSelected = output<NavItem>();
}

/**
 * Dropdown Menu — shadcn-style dropdown
 */

import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-dropdown-menu',
  template: `
    <div class="relative inline-block text-left" #container>
      <div
        role="button"
        tabindex="0"
        (click)="toggle($event)"
        (keydown.enter)="toggle($event)"
        (keydown.space)="onTriggerSpace($event)"
      >
        <ng-content select="[dropdownTrigger]"></ng-content>
      </div>

      @if (open()) {
        <div class="dropdown-content animate-fadeIn" [class]="alignClass()" role="menu">
          <ng-content select="[dropdownContent]"></ng-content>
        </div>
      }
    </div>
  `,
})
export class DropdownMenuComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  align = input<'start' | 'end'>('end');
  openChange = output<boolean>();

  open = signal(false);

  alignClass = computed(() =>
    this.align() === 'end' ? 'dropdown-content-end' : 'dropdown-content-start',
  );

  constructor() {
    const onDocumentClick = (event: MouseEvent): void => {
      if (!this.host.nativeElement.contains(event.target as Node)) {
        this.close();
      }
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        this.close();
      }
    };

    this.document.addEventListener('click', onDocumentClick);
    this.document.addEventListener('keydown', onKeyDown);

    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('click', onDocumentClick);
      this.document.removeEventListener('keydown', onKeyDown);
    });
  }

  toggle(event: Event): void {
    event.stopPropagation();
    this.setOpen(!this.open());
  }

  onTriggerSpace(event: Event): void {
    event.preventDefault();
    this.toggle(event);
  }

  close(): void {
    this.setOpen(false);
  }

  private setOpen(value: boolean): void {
    this.open.set(value);
    this.openChange.emit(value);
  }
}

@Component({
  selector: 'app-dropdown-label',
  template: `<div class="dropdown-label"><ng-content></ng-content></div>`,
})
export class DropdownLabelComponent {}

@Component({
  selector: 'app-dropdown-item',
  template: `
    <button
      type="button"
      role="menuitem"
      class="dropdown-item"
      [class.dropdown-item-destructive]="destructive()"
      [class.dropdown-item-disabled]="disabled()"
      [disabled]="disabled()"
      (click)="handleClick($event)"
    >
      <ng-content></ng-content>
    </button>
  `,
})
export class DropdownItemComponent {
  destructive = input(false);
  disabled = input(false);
  itemClick = output<MouseEvent>();

  handleClick(event: MouseEvent): void {
    if (this.disabled()) return;
    this.itemClick.emit(event);
  }
}

@Component({
  selector: 'app-dropdown-separator',
  template: `<div class="dropdown-separator" role="separator"></div>`,
})
export class DropdownSeparatorComponent {}

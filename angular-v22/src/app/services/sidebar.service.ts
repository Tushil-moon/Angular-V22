/**
 * Sidebar Service — shadcn collapsible sidebar state
 */

import { Injectable, signal, computed } from '@angular/core';

const STORAGE_KEY = 'sidebar_state';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private readonly collapsedSignal = signal(this.readStored());

  readonly collapsed = this.collapsedSignal.asReadonly();
  readonly state = computed(() => (this.collapsedSignal() ? 'collapsed' : 'expanded'));

  toggle(): void {
    this.setCollapsed(!this.collapsedSignal());
  }

  expand(): void {
    this.setCollapsed(false);
  }

  collapse(): void {
    this.setCollapsed(true);
  }

  private setCollapsed(value: boolean): void {
    this.collapsedSignal.set(value);
    localStorage.setItem(STORAGE_KEY, value ? 'collapsed' : 'expanded');
  }

  private readStored(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'collapsed';
  }
}

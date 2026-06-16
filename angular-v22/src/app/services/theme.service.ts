/**
 * Theme Service — light / dark mode with localStorage persistence
 */

import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly modeSignal = signal<ThemeMode>(this.readStored());

  readonly mode = this.modeSignal.asReadonly();
  readonly isDark = computed(() => this.modeSignal() === 'dark');

  init(): void {
    this.apply(this.modeSignal());
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  setTheme(mode: ThemeMode): void {
    this.modeSignal.set(mode);
    localStorage.setItem(STORAGE_KEY, mode);
    this.apply(mode);
  }

  private apply(mode: ThemeMode): void {
    const root = this.document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    root.style.colorScheme = mode;
  }

  private readStored(): ThemeMode {
    if (typeof localStorage === 'undefined') return 'dark';
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' ? 'light' : 'dark';
  }
}

/**
 * Toast Service — shadcn Sonner-style notifications
 */

import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'default' | 'success' | 'destructive';

export interface Toast {
    id: string;
    title: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
}

@Injectable({
    providedIn: 'root',
})
export class ToastService {
    private readonly toastsSignal = signal<Toast[]>([]);
    readonly toasts = this.toastsSignal.asReadonly();

    private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

    show(payload: Omit<Toast, 'id'>): string {
        const id = crypto.randomUUID();
        const toast: Toast = {
            id,
            variant: 'default',
            duration: 4000,
            ...payload,
        };

        this.toastsSignal.update((items) => [...items, toast]);

        if (toast.duration && toast.duration > 0) {
            const timer = setTimeout(() => this.dismiss(id), toast.duration);
            this.timers.set(id, timer);
        }

        return id;
    }

    success(title: string, description?: string): string {
        return this.show({ title, description, variant: 'success' });
    }

    error(title: string, description?: string): string {
        return this.show({ title, description, variant: 'destructive' });
    }

    dismiss(id: string): void {
        const timer = this.timers.get(id);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(id);
        }
        this.toastsSignal.update((items) => items.filter((t) => t.id !== id));
    }

    dismissAll(): void {
        this.timers.forEach((timer) => clearTimeout(timer));
        this.timers.clear();
        this.toastsSignal.set([]);
    }
}

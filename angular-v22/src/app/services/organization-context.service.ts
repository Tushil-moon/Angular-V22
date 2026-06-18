import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'crm.activeOrganizationId';

@Injectable({ providedIn: 'root' })
export class OrganizationContextService {
    readonly activeOrganizationId = signal<string | null>(this.readStored());

    setActiveOrganizationId(organizationId: string): void {
        localStorage.setItem(STORAGE_KEY, organizationId);
        this.activeOrganizationId.set(organizationId);
    }

    clearActiveOrganization(): void {
        localStorage.removeItem(STORAGE_KEY);
        this.activeOrganizationId.set(null);
    }

    private readStored(): string | null {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem(STORAGE_KEY);
    }
}

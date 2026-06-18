import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { OrganizationMembership } from '@models/index';
import { OrganizationContextService, OrganizationService } from '@services/index';

import { IconComponent } from './icon.component';
import { SelectComponent, SelectOption } from './select.component';

@Component({
    selector: 'app-org-switcher',
    imports: [IconComponent, SelectComponent],
    template: `
        @if (memberships().length > 0) {
            <div
                [class.org-switcher]="mode() === 'header'"
                [class.org-switcher-drawer]="mode() === 'drawer'"
            >
                <app-icon
                    name="building-2"
                    [size]="14"
                    className="text-muted-foreground shrink-0"
                />
                <app-select
                    [options]="orgOptions()"
                    [value]="activeOrganizationId() ?? ''"
                    size="sm"
                    ariaLabel="Switch organization"
                    (valueChange)="onSwitch($event)"
                />
            </div>
        }
    `,
})
export class OrgSwitcherComponent implements OnInit {
    private readonly organizationService = inject(OrganizationService);
    private readonly organizationContext = inject(OrganizationContextService);

    /** `header` — desktop header (hidden below md). `drawer` — full width in mobile nav sheet. */
    mode = input<'header' | 'drawer'>('header');

    memberships = signal<OrganizationMembership[]>([]);
    activeOrganizationId = computed(() => this.organizationContext.activeOrganizationId());

    orgOptions = computed<SelectOption[]>(() =>
        this.memberships().map((membership) => ({
            value: membership.organizationId,
            label: membership.organization.name,
        })),
    );

    ngOnInit(): void {
        void this.loadOrganizations();
    }

    async onSwitch(organizationId: string): Promise<void> {
        if (!organizationId) return;
        this.organizationContext.setActiveOrganizationId(organizationId);
        window.location.reload();
    }

    private async loadOrganizations(): Promise<void> {
        const memberships = await this.organizationService.listOrganizations();
        this.memberships.set(memberships);

        const stored = this.organizationContext.activeOrganizationId();
        const active =
            memberships.find((item) => item.organizationId === stored)?.organizationId ??
            memberships[0]?.organizationId;

        if (active) {
            this.organizationContext.setActiveOrganizationId(active);
        }
    }
}

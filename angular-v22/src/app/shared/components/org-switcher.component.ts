import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { OrganizationContextService, OrganizationService } from '@services/index';
import { OrganizationMembership } from '@models/index';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-org-switcher',
  imports: [IconComponent],
  template: `
    @if (memberships().length > 0) {
      <div class="org-switcher">
        <app-icon name="building-2" [size]="14" className="text-muted-foreground shrink-0" />
        <select
          class="select org-switcher-select"
          [value]="activeOrganizationId() ?? ''"
          (change)="onSwitch($event)"
          aria-label="Switch organization"
        >
          @for (membership of memberships(); track membership.organizationId) {
            <option [value]="membership.organizationId">
              {{ membership.organization.name }}
            </option>
          }
        </select>
      </div>
    }
  `,
})
export class OrgSwitcherComponent implements OnInit {
  private readonly organizationService = inject(OrganizationService);
  private readonly organizationContext = inject(OrganizationContextService);

  memberships = signal<OrganizationMembership[]>([]);
  activeOrganizationId = computed(() => this.organizationContext.activeOrganizationId());

  ngOnInit(): void {
    void this.loadOrganizations();
  }

  async onSwitch(event: Event): Promise<void> {
    const organizationId = (event.target as HTMLSelectElement).value;
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

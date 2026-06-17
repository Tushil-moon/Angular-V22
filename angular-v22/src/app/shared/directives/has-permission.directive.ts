/**
 * Structural directive — show content only when user has permission
 */

import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { PermissionService } from '@services/permission.service';

@Directive({
  selector: '[appHasPermission]',
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly permissionService = inject(PermissionService);

  appHasPermission = input.required<string | string[]>();

  constructor() {
    effect(() => {
      const required = this.appHasPermission();
      const permissions = Array.isArray(required) ? required : [required];
      const allowed = this.permissionService.hasAny(...permissions);

      this.viewContainer.clear();
      if (allowed) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}

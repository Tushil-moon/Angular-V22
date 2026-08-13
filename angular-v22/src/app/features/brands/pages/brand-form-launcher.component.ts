/**
 * Deep-link launcher — opens brand form dialog then returns to list.
 */

import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService } from '@services/dialog.service';
import { ignorePromise } from '@utils/form-display.util';

import { openBrandFormDialog } from '../utils/open-brand-form-dialog.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-brand-form-launcher',
    template: '',
})
export class BrandFormLauncherComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly dialog = inject(DialogService);

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        const brandId = id && id !== 'new' ? id : null;

        openBrandFormDialog(this.dialog, brandId).subscribe(() => {
            ignorePromise(this.router.navigate(['/dashboard/brands'], { replaceUrl: true }));
        });
    }
}

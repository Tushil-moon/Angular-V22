/**
 * Deep-link launcher — opens product form dialog then returns to list.
 */

import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService } from '@services/dialog.service';
import { ignorePromise } from '@utils/form-display.util';

import { openProductFormDialog } from '../utils/open-product-form-dialog.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-product-form-launcher',
    template: '',
})
export class ProductFormLauncherComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly dialog = inject(DialogService);

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        const productId = id && id !== 'new' ? id : null;

        openProductFormDialog(this.dialog, productId).subscribe(() => {
            ignorePromise(this.router.navigate(['/dashboard/products'], { replaceUrl: true }));
        });
    }
}

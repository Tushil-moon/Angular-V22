/**
 * Deep-link launcher — opens category form dialog then returns to list.
 */

import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService } from '@services/dialog.service';
import { ignorePromise } from '@utils/form-display.util';

import { openCategoryFormDialog } from '../utils/open-category-form-dialog.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-category-form-launcher',
    template: '',
})
export class CategoryFormLauncherComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly dialog = inject(DialogService);

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        const categoryId = id && id !== 'new' ? id : null;

        openCategoryFormDialog(this.dialog, categoryId).subscribe(() => {
            ignorePromise(this.router.navigate(['/dashboard/categories'], { replaceUrl: true }));
        });
    }
}

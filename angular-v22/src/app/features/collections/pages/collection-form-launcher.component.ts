/**
 * Deep-link launcher — opens collection form dialog then returns to list.
 */

import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService } from '@services/dialog.service';
import { ignorePromise } from '@utils/form-display.util';

import { openCollectionFormDialog } from '../utils/open-collection-form-dialog.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-collection-form-launcher',
    template: '',
})
export class CollectionFormLauncherComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly dialog = inject(DialogService);

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        const collectionId = id && id !== 'new' ? id : null;

        openCollectionFormDialog(this.dialog, collectionId).subscribe(() => {
            ignorePromise(this.router.navigate(['/dashboard/collections'], { replaceUrl: true }));
        });
    }
}

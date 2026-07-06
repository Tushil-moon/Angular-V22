import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import type { Territory } from '@models/enterprise.model';
import { DialogService, TerritoryService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseDate } from '../enterprise/enterprise-list.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-territories-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            #shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [openDetailFn]="openDetailFn"
            listTitle="Territory definitions"
        />
    `,
})
export class TerritoriesListComponent {
    private readonly territoryService = inject(TerritoryService);
    private readonly dialogService = inject(DialogService);
    private readonly shell = viewChild<EnterpriseListShellComponent<Territory>>('shell');

    readonly config: EnterpriseListConfig<Territory> = {
        title: 'Territories',
        description: 'Sales territory definitions',
        entityLabel: 'territory',
        cardTitle: (t) => t.name,
        cardSubtitle: (t) => formatEnterpriseDate(t.createdAt),
        columns: [
            { key: 'name', label: 'Name', cell: (t) => t.name },
            {
                key: 'createdAt',
                label: 'Created',
                cell: (t) => formatEnterpriseDate(t.createdAt),
                hideBelow: 'md',
            },
        ],
    };

    readonly listFn = (filters: Parameters<TerritoryService['list']>[0]) =>
        this.territoryService.list(filters);

    readonly createFn = async () => {
        await this.openTerritoryDialog();
        return null;
    };

    readonly deleteFn = (id: string) => this.territoryService.delete(id);

    readonly openDetailFn = (item: Territory) => this.openTerritoryDialog(item.id);

    private async openTerritoryDialog(territoryId?: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./territory-dialog.component').TerritoryDialogComponent,
            import('./territory-dialog.component').TerritoryDialogData,
            import('./territory-dialog.component').TerritoryDialogResult
        >(
            () => import('./territory-dialog.component').then((m) => m.TerritoryDialogComponent),
            { data: { territoryId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.shell()?.reload();
        });
    }
}

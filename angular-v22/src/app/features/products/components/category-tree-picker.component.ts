/**
 * Hierarchical category multi-select for product forms.
 */

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CategoryTreeNode } from '@features/categories/models/category.model';

interface FlatCategoryNode {
    id: string;
    name: string;
    depth: number;
    status: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-category-tree-picker',
    imports: [RouterLink],
    template: `
        <div class="category-tree-picker">
            @if (flatNodes().length) {
                <div class="category-tree-picker-list">
                    @for (node of flatNodes(); track node.id) {
                        <label
                            class="category-tree-picker-row"
                            [style.padding-left.rem]="0.75 + node.depth * 1.25"
                        >
                            <input
                                type="checkbox"
                                class="checkbox"
                                [checked]="isSelected(node.id)"
                                [disabled]="disabled()"
                                (change)="toggle(node.id, $event)"
                            />
                            <span class="min-w-0 truncate">{{ node.name }}</span>
                            @if (node.status !== 'PUBLISHED') {
                                <span class="text-xs text-muted-foreground">({{ node.status }})</span>
                            }
                        </label>
                    }
                </div>
            } @else {
                <p class="text-sm text-muted-foreground">
                    No categories yet.
                    <a routerLink="/dashboard/categories" class="text-primary underline-offset-2 hover:underline">
                        Create categories
                    </a>
                </p>
            }
            @if (selectedCount() > 0) {
                <p class="category-tree-picker-summary">{{ selectedCount() }} selected</p>
            }
        </div>
    `,
})
export class CategoryTreePickerComponent {
    nodes = input<CategoryTreeNode[]>([]);
    selectedIds = input<string[]>([]);
    disabled = input(false);
    onlyPublished = input(true);

    selectedIdsChange = output<string[]>();

    readonly flatNodes = computed((): FlatCategoryNode[] => {
        const items: FlatCategoryNode[] = [];
        const walk = (nodes: CategoryTreeNode[], depth: number) => {
            for (const node of nodes) {
                if (!this.onlyPublished() || node.status === 'PUBLISHED') {
                    items.push({
                        id: node.id,
                        name: node.name,
                        depth,
                        status: node.status,
                    });
                }
                if (node.children.length) {
                    walk(node.children, depth + 1);
                }
            }
        };
        walk(this.nodes(), 0);
        return items;
    });

    readonly selectedCount = computed(() => this.selectedIds().length);

    isSelected(id: string): boolean {
        return this.selectedIds().includes(id);
    }

    toggle(id: string, event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        const next = new Set(this.selectedIds());
        if (checked) next.add(id);
        else next.delete(id);
        this.selectedIdsChange.emit([...next]);
    }
}

/**
 * Flatten category trees for select / filter options.
 */

import type { SelectOption } from '@shared/components';

import type { CategoryTreeNode } from '../models/category.model';

/** Collect a node id and all descendant ids (for parent-picker exclusion). */
export function collectDescendantIds(node: CategoryTreeNode): Set<string> {
    const ids = new Set<string>([node.id]);
    for (const child of node.children) {
        for (const id of collectDescendantIds(child)) ids.add(id);
    }
    return ids;
}

export function findCategoryNode(
    nodes: CategoryTreeNode[],
    id: string,
): CategoryTreeNode | null {
    for (const node of nodes) {
        if (node.id === id) return node;
        const nested = findCategoryNode(node.children, id);
        if (nested) return nested;
    }
    return null;
}

export function flattenCategoryOptions(
    nodes: CategoryTreeNode[],
    options: {
        excludeIds?: Set<string>;
        publishedOnly?: boolean;
        emptyLabel?: string;
    } = {},
): SelectOption[] {
    const result: SelectOption[] = [
        { value: '', label: options.emptyLabel ?? 'No parent (top-level)' },
    ];

    const walk = (items: CategoryTreeNode[], depth: number) => {
        for (const node of items) {
            if (options.excludeIds?.has(node.id)) continue;
            if (options.publishedOnly && node.status !== 'PUBLISHED') {
                walk(node.children, depth);
                continue;
            }
            const prefix = depth > 0 ? `${'— '.repeat(depth)}` : '';
            result.push({ value: node.id, label: `${prefix}${node.name}` });
            if (node.children.length) walk(node.children, depth + 1);
        }
    };

    walk(nodes, 0);
    return result;
}

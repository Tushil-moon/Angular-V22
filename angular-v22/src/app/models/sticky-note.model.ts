/**
 * Sticky note model
 */

export interface StickyNote {
    id: string;
    userId: string;
    title?: string | null;
    content: string;
    color: string;
    isPinned: boolean;
    sortOrder: number;
    createdAt?: string;
    updatedAt?: string;
}

export const STICKY_NOTE_COLORS = [
    { id: 'yellow', value: '#fef08a', label: 'Yellow' },
    { id: 'blue', value: '#bfdbfe', label: 'Blue' },
    { id: 'green', value: '#bbf7d0', label: 'Green' },
    { id: 'pink', value: '#fbcfe8', label: 'Pink' },
    { id: 'purple', value: '#e9d5ff', label: 'Purple' },
    { id: 'orange', value: '#fed7aa', label: 'Orange' },
    { id: 'slate', value: '#e2e8f0', label: 'Gray' },
] as const;

export type StickyNoteColorId = (typeof STICKY_NOTE_COLORS)[number]['id'];

export type FlexTableBreakpoint = 'sm' | 'md' | 'lg';

export interface FlexTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  /** Visually hide header label but keep it for screen readers (e.g. Actions). */
  headerSrOnly?: boolean;
  /** CSS grid track, e.g. minmax(8rem, 1.5fr) or 5rem */
  grid: string;
  hideBelow?: FlexTableBreakpoint;
  skeletonClass?: string;
}

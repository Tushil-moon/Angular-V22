export interface DialogConfig<D = unknown> {
  data?: D;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  panelClass?: string | string[];
  width?: string;
  maxWidth?: string;
}

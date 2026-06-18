import { InjectionToken } from '@angular/core';

import type { DialogConfig } from './dialog.types';

export const DIALOG_DATA = new InjectionToken<unknown>('DIALOG_DATA');
export const DIALOG_CONFIG = new InjectionToken<DialogConfig>('DIALOG_CONFIG');
export const DIALOG_CLOSE = new InjectionToken<() => void>('DIALOG_CLOSE');

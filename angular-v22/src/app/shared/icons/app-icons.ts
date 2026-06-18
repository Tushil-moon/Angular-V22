import type { Provider } from '@angular/core';
import {
    LucideActivity,
    LucideBell,
    LucideBriefcase,
    LucideBuilding2,
    LucideCheck,
    LucideChevronDown,
    LucideChevronRight,
    LucideChevronsUpDown,
    LucideCircleAlert,
    LucideCircleDollarSign,
    LucideContactRound,
    LucideEllipsisVertical,
    LucideEye,
    LucideLayoutDashboard,
    LucideList,
    LucideLogOut,
    LucideMenu,
    LucideMoon,
    LucidePanelLeft,
    LucidePlus,
    LucideSearch,
    LucideSettings,
    LucideShield,
    LucideSun,
    LucideTrash2,
    LucideUser,
    LucideUsers,
    LucideX,
    provideLucideConfig,
    provideLucideIcons,
} from '@lucide/angular';

/** Kebab-case icon names registered for the app. */
export const APP_ICON_NAMES = [
    'layout-dashboard',
    'users',
    'shield',
    'settings',
    'log-out',
    'menu',
    'x',
    'chevron-down',
    'chevron-right',
    'bell',
    'search',
    'plus',
    'activity',
    'user',
    'check',
    'alert-circle',
    'panel-left',
    'chevrons-up-down',
    'more-vertical',
    'sun',
    'moon',
    'trash-2',
    'eye',
    'contact-round',
    'briefcase',
    'building-2',
    'circle-dollar-sign',
    'list',
] as const;

export type IconName = (typeof APP_ICON_NAMES)[number];

const APP_LUCIDE_ICONS = [
    LucideLayoutDashboard,
    LucideUsers,
    LucideShield,
    LucideSettings,
    LucideLogOut,
    LucideMenu,
    LucideX,
    LucideChevronDown,
    LucideChevronRight,
    LucideBell,
    LucideSearch,
    LucidePlus,
    LucideActivity,
    LucideUser,
    LucideCheck,
    LucideCircleAlert,
    LucidePanelLeft,
    LucideChevronsUpDown,
    LucideEllipsisVertical,
    LucideSun,
    LucideMoon,
    LucideTrash2,
    LucideEye,
    LucideContactRound,
    LucideBriefcase,
    LucideBuilding2,
    LucideCircleDollarSign,
    LucideList,
] as const;

/** Registers all app icons for dynamic `lucideIcon` usage by name. */
export function provideAppIcons(): Provider {
    return provideLucideIcons(...APP_LUCIDE_ICONS);
}

/** Global Lucide defaults (overridable per icon via inputs). */
export function provideAppIconConfig(): Provider {
    return provideLucideConfig({
        size: 16,
        strokeWidth: 2,
    });
}

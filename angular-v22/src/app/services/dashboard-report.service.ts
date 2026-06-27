/**
 * Dashboard Report Service — lazy-loaded analytics helper
 */

import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class DashboardReportService {
    trackRefresh(): void {
        // Placeholder for optional analytics / export integration loaded on demand.
    }
}

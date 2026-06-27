import type { OverlayRef } from '@angular/cdk/overlay';
import { Observable, Subject } from 'rxjs';

export class DialogRef<T = unknown, R = unknown> {
    private readonly closed$ = new Subject<R | undefined>();
    private disposed = false;

    componentInstance?: T;

    constructor(private readonly overlayRef: OverlayRef) {}

    close(result?: R): void {
        if (this.disposed) return;
        this.disposed = true;
        this.overlayRef.dispose();
        this.closed$.next(result);
        this.closed$.complete();
    }

    afterClosed(): Observable<R | undefined> {
        return this.closed$.asObservable();
    }
}

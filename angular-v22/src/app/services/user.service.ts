/**
 * User Service
 */

import { computed, inject, Injectable, signal } from '@angular/core';
import { FilterOptions, User } from '@models/index';
import {
    ApiPaginatedPayload,
    ApiUserPayload,
    mapApiPaginated,
    mapApiUser,
} from '@utils/api-mappers';
import { catchError, finalize, map, Observable, of, tap, throwError } from 'rxjs';

import { HttpClientService } from './http-client.service';

@Injectable({
    providedIn: 'root',
})
export class UserService {
    private readonly usersSignal = signal<User[]>([]);
    private readonly currentUserSignal = signal<User | null>(null);
    private readonly isLoadingSignal = signal<boolean>(false);
    private readonly totalUsersSignal = signal<number>(0);

    readonly users = computed(() => this.usersSignal());
    readonly currentUser = computed(() => this.currentUserSignal());
    readonly isLoading = computed(() => this.isLoadingSignal());
    readonly totalUsers = computed(() => this.totalUsersSignal());

    private readonly httpClient = inject(HttpClientService);

    getUsers(filters?: FilterOptions, showLoading = false): Observable<void> {
        const hasData = this.usersSignal().length > 0;
        if (showLoading || !hasData) {
            this.isLoadingSignal.set(true);
        }

        return this.httpClient.get<ApiPaginatedPayload<ApiUserPayload>>('/users', { params: filters }).pipe(
            tap((response) => {
                if (response.data) {
                    const page = mapApiPaginated(response.data, mapApiUser);
                    this.usersSignal.set(page.data);
                    this.totalUsersSignal.set(page.total);
                }
            }),
            map(() => undefined),
            catchError((error) => {
                console.error('Failed to fetch users:', error);
                this.usersSignal.set([]);
                this.totalUsersSignal.set(0);
                return of(undefined);
            }),
            finalize(() => this.isLoadingSignal.set(false)),
        );
    }

    getCurrentUserProfile(): Observable<User | null> {
        return this.httpClient.get<ApiUserPayload>('/users/me').pipe(
            map((response) => {
                if (response.data) {
                    const user = mapApiUser(response.data);
                    this.currentUserSignal.set(user);
                    return user;
                }
                return null;
            }),
            catchError((error) => {
                console.error('Failed to fetch profile:', error);
                return of(null);
            }),
        );
    }

    getUserById(userId: string, updateLoading = false): Observable<User | null> {
        if (updateLoading) {
            this.isLoadingSignal.set(true);
        }

        return this.httpClient.get<ApiUserPayload>(`/users/${userId}`).pipe(
            map((response) => {
                if (response.data) {
                    const user = mapApiUser(response.data);
                    this.currentUserSignal.set(user);
                    return user;
                }
                return null;
            }),
            catchError((error) => {
                console.error('Failed to fetch user:', error);
                return of(null);
            }),
            finalize(() => {
                if (updateLoading) {
                    this.isLoadingSignal.set(false);
                }
            }),
        );
    }

    createUser(payload: {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
    }): Observable<User | null> {
        return this.httpClient.post<ApiUserPayload>('/users', payload).pipe(
            map((response) => {
                if (response.data) {
                    const user = mapApiUser(response.data);
                    this.usersSignal.set([user, ...this.usersSignal()]);
                    this.totalUsersSignal.set(this.totalUsersSignal() + 1);
                    return user;
                }
                return null;
            }),
            catchError((error) => {
                console.error('Failed to create user:', error);
                return throwError(() => error);
            }),
        );
    }

    deleteUser(userId: string): Observable<boolean> {
        return this.httpClient.delete(`/users/${userId}`).pipe(
            tap(() => {
                this.usersSignal.set(this.usersSignal().filter((u) => u.id !== userId));
                this.totalUsersSignal.set(Math.max(0, this.totalUsersSignal() - 1));
            }),
            map(() => true),
            catchError((error) => {
                console.error('Failed to delete user:', error);
                return of(false);
            }),
        );
    }

    updateUser(
        userId: string,
        payload: { email?: string; phone?: string; isActive?: boolean },
    ): Observable<User | null> {
        const body: Record<string, string | undefined> = {};
        if (payload.email !== undefined) body['email'] = payload.email;
        if (payload.phone !== undefined) body['phone'] = payload.phone;
        if (payload.isActive !== undefined) {
            body['status'] = payload.isActive ? 'ACTIVE' : 'INACTIVE';
        }

        return this.httpClient.patch<ApiUserPayload>(`/users/${userId}`, body).pipe(
            map((response) => {
                if (response.data) {
                    const user = mapApiUser(response.data);
                    this.usersSignal.update((users) =>
                        users.map((item) => (item.id === userId ? user : item)),
                    );
                    return user;
                }
                return null;
            }),
            catchError((error) => {
                console.error('Failed to update user:', error);
                return throwError(() => error);
            }),
        );
    }

    clearCurrentUser(): void {
        this.currentUserSignal.set(null);
    }
}

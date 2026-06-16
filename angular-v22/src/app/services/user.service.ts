/**
 * User Service
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { User, PaginatedResponse, FilterOptions } from '@models/index';
import { mapApiUser, mapApiPaginated, ApiUserPayload, ApiPaginatedPayload } from '@utils/api-mappers';

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

  async getUsers(filters?: FilterOptions, showLoading = false): Promise<void> {
    const hasData = this.usersSignal().length > 0;
    if (showLoading || !hasData) {
      this.isLoadingSignal.set(true);
    }

    try {
      const response = await this.httpClient.get<ApiPaginatedPayload<ApiUserPayload>>('/users', {
        params: filters,
      });

      if (response.data) {
        const page = mapApiPaginated(response.data, mapApiUser);
        this.usersSignal.set(page.data);
        this.totalUsersSignal.set(page.total);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      this.usersSignal.set([]);
      this.totalUsersSignal.set(0);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async getCurrentUserProfile(): Promise<User | null> {
    try {
      const response = await this.httpClient.get<ApiUserPayload>('/users/me');
      if (response.data) {
        const user = mapApiUser(response.data);
        this.currentUserSignal.set(user);
        return user;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      return null;
    }
  }

  async getUserById(userId: string, updateLoading = false): Promise<User | null> {
    if (updateLoading) {
      this.isLoadingSignal.set(true);
    }

    try {
      const response = await this.httpClient.get<ApiUserPayload>(`/users/${userId}`);
      if (response.data) {
        const user = mapApiUser(response.data);
        this.currentUserSignal.set(user);
        return user;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return null;
    } finally {
      if (updateLoading) {
        this.isLoadingSignal.set(false);
      }
    }
  }

  async createUser(payload: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User | null> {
    try {
      const response = await this.httpClient.post<ApiUserPayload>('/users', payload);
      if (response.data) {
        const user = mapApiUser(response.data);
        this.usersSignal.set([user, ...this.usersSignal()]);
        this.totalUsersSignal.set(this.totalUsersSignal() + 1);
        return user;
      }
      return null;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      await this.httpClient.delete(`/users/${userId}`);
      this.usersSignal.set(this.usersSignal().filter((u) => u.id !== userId));
      this.totalUsersSignal.set(Math.max(0, this.totalUsersSignal() - 1));
      return true;
    } catch (error) {
      console.error('Failed to delete user:', error);
      return false;
    }
  }

  async updateUser(
    userId: string,
    payload: { email?: string; phone?: string; isActive?: boolean },
  ): Promise<User | null> {
    try {
      const body: Record<string, string | undefined> = {};
      if (payload.email !== undefined) body['email'] = payload.email;
      if (payload.phone !== undefined) body['phone'] = payload.phone;
      if (payload.isActive !== undefined) {
        body['status'] = payload.isActive ? 'ACTIVE' : 'INACTIVE';
      }

      const response = await this.httpClient.patch<ApiUserPayload>(`/users/${userId}`, body);
      if (response.data) {
        const user = mapApiUser(response.data);
        this.usersSignal.update((users) => users.map((item) => (item.id === userId ? user : item)));
        return user;
      }
      return null;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }

  clearCurrentUser(): void {
    this.currentUserSignal.set(null);
  }
}

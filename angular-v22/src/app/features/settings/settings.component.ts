/**
 * Settings Page — profile, security, sessions
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, OrganizationService, SessionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
  CardComponent,
  CardHeaderComponent,
  CardTitleComponent,
  CardDescriptionComponent,
  CardBodyComponent,
  ButtonComponent,
  AvatarComponent,
  InputComponent,
  SkeletonComponent,
  SubmitButtonComponent,
} from '@shared/components';
import { changePasswordSchema, safeValidate } from '@utils/validators';
import { getUserDisplayName, getUserInitials } from '@features/users/user.utils';

type SettingsTab = 'profile' | 'security' | 'sessions' | 'organization';

@Component({
  selector: 'app-settings',
  imports: [
    ReactiveFormsModule,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardBodyComponent,
    ButtonComponent,
    AvatarComponent,
    InputComponent,
    SkeletonComponent,
    SubmitButtonComponent,
  ],
  template: `
    <div class="page-shell">
      <div class="page-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-description">Manage your account, security, and active sessions.</p>
      </div>

      <div class="settings-tabs" role="tablist">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            role="tab"
            class="settings-tab"
            [class.settings-tab-active]="activeTab() === tab.id"
            [attr.aria-selected]="activeTab() === tab.id"
            (click)="activeTab.set(tab.id)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      @switch (activeTab()) {
        @case ('profile') {
          <app-card>
            <app-card-header>
              <app-card-title>Profile</app-card-title>
              <app-card-description>Your account information</app-card-description>
            </app-card-header>
            <app-card-body class="space-y-6">
              <div class="flex items-center gap-4">
                <app-avatar [fallback]="userInitials()" size="lg" />
                <div class="space-y-1">
                  <p class="text-sm font-medium">{{ displayName() }}</p>
                  <p class="text-sm text-muted-foreground">{{ userEmail() }}</p>
                </div>
              </div>

              <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="space-y-1">
                  <dt class="text-xs font-medium text-muted-foreground">Email verified</dt>
                  <dd>
                    <span [class]="emailVerified() ? 'badge badge-success' : 'badge badge-warning'">
                      {{ emailVerified() ? 'Verified' : 'Pending' }}
                    </span>
                  </dd>
                </div>
                <div class="space-y-1">
                  <dt class="text-xs font-medium text-muted-foreground">Account status</dt>
                  <dd>
                    <span class="badge badge-success">Active</span>
                  </dd>
                </div>
              </dl>

              @if (!emailVerified()) {
                <app-button
                  variant="outline"
                  size="sm"
                  [disabled]="verificationSending()"
                  (clicked)="resendVerification()"
                >
                  Resend verification email
                </app-button>
              }
            </app-card-body>
          </app-card>
        }

        @case ('security') {
          <app-card>
            <app-card-header>
              <app-card-title>Security</app-card-title>
              <app-card-description>Update your password</app-card-description>
            </app-card-header>
            <app-card-body>
              <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="max-w-md space-y-4">
                <app-input
                  id="currentPassword"
                  type="password"
                  label="Current password"
                  formControlName="currentPassword"
                  [error]="passwordFieldError('currentPassword')"
                  [required]="true"
                />
                <app-input
                  id="newPassword"
                  type="password"
                  label="New password"
                  formControlName="newPassword"
                  [error]="passwordFieldError('newPassword')"
                  [required]="true"
                />
                <app-input
                  id="confirmPassword"
                  type="password"
                  label="Confirm new password"
                  formControlName="confirmPassword"
                  [error]="passwordFieldError('confirmPassword')"
                  [required]="true"
                />

                <app-submit-button
                  label="Update password"
                  loadingLabel="Updating..."
                  [loading]="authService.isLoading()"
                />
              </form>
            </app-card-body>
          </app-card>
        }

        @case ('organization') {
          <app-card>
            <app-card-header>
              <app-card-title>Organization</app-card-title>
              <app-card-description>Workspace timezone, currency, and team invites</app-card-description>
            </app-card-header>
            <app-card-body class="space-y-6">
              <form [formGroup]="organizationForm" class="grid max-w-md gap-4">
                <app-input id="org-name" label="Organization name" formControlName="name" />
                <app-input id="org-timezone" label="Timezone" formControlName="timezone" />
                <app-input id="org-currency" label="Currency" formControlName="currency" />
                <app-button type="button" size="sm" [disabled]="orgSaving()" (clicked)="saveOrganization()">
                  Save organization settings
                </app-button>
              </form>

              <div class="max-w-md space-y-3 border-t border-border pt-6">
                <p class="text-sm font-medium text-foreground">Invite member</p>
                <form [formGroup]="inviteForm" class="grid gap-3">
                  <app-input id="invite-email" type="email" label="Email" formControlName="email" />
                  <app-button type="button" size="sm" [disabled]="inviteSending()" (clicked)="sendInvite()">
                    Send invite
                  </app-button>
                </form>
                @if (lastInviteToken()) {
                  <p class="text-xs text-muted-foreground break-all">
                    Invite token (dev): {{ lastInviteToken() }}
                  </p>
                }
              </div>
            </app-card-body>
          </app-card>
        }

        @case ('sessions') {
          <app-card>
            <app-card-header [row]="true">
              <div class="space-y-1">
                <app-card-title>Active sessions</app-card-title>
                <app-card-description>Devices where you're currently signed in</app-card-description>
              </div>
              <app-button variant="outline" size="sm" (clicked)="sessionService.reload()">
                Refresh
              </app-button>
            </app-card-header>
            <app-card-body class="divide-y divide-border p-0">
              @if (sessionService.isLoading()) {
                <div class="space-y-3 p-6">
                  @for (_ of skeletonItems; track $index) {
                    <app-skeleton className="h-14 w-full" />
                  }
                </div>
              } @else if (sessionService.sessions().length === 0) {
                <div class="flex min-h-10 items-center justify-center p-6">
                  <p class="text-sm text-muted-foreground">No active sessions</p>
                </div>
              } @else {
                @for (session of sessionService.sessions(); track session.id) {
                  <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0 space-y-1">
                      <p class="text-sm font-medium">
                        {{ session.deviceName || 'Unknown device' }}
                        @if (session.current) {
                          <span class="badge badge-success ml-2">Current</span>
                        }
                      </p>
                      <p class="truncate text-xs text-muted-foreground">
                        {{ session.ipAddress || '—' }} · Last active
                        {{ formatDate(session.lastActiveAt) }}
                      </p>
                    </div>
                    @if (!session.current) {
                      <app-button
                        variant="outline"
                        size="sm"
                        [disabled]="revokingId() === session.id"
                        (clicked)="revokeSession(session.id)"
                      >
                        Revoke
                      </app-button>
                    }
                  </div>
                }
              }
            </app-card-body>
          </app-card>
        }
      }
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  authService = inject(AuthService);
  sessionService = inject(SessionService);
  private readonly organizationService = inject(OrganizationService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly tabs: { id: SettingsTab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'organization', label: 'Organization' },
    { id: 'security', label: 'Security' },
    { id: 'sessions', label: 'Sessions' },
  ];

  readonly skeletonItems = Array.from({ length: 3 }, (_, i) => i);

  activeTab = signal<SettingsTab>('profile');
  verificationSending = signal(false);
  revokingId = signal<string | null>(null);
  passwordErrors = signal<Record<string, string[]>>({});

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', Validators.required],
    confirmPassword: ['', Validators.required],
  });

  organizationForm = this.fb.group({
    name: [''],
    timezone: ['UTC'],
    currency: ['USD'],
  });

  inviteForm = this.fb.group({
    email: ['', Validators.required],
  });

  orgSaving = signal(false);
  inviteSending = signal(false);
  lastInviteToken = signal<string | null>(null);

  displayName = () => {
    const user = this.authService.currentUser();
    return user ? getUserDisplayName(user) : 'User';
  };

  userInitials = () => {
    const user = this.authService.currentUser();
    return user ? getUserInitials(user) : 'U';
  };

  userEmail = () => this.authService.currentUser()?.email ?? '';
  emailVerified = () => this.authService.currentUser()?.emailVerified ?? false;

  ngOnInit(): void {
    void this.authService.refreshProfile();
    this.sessionService.reload();
    void this.loadOrganizationSettings();
  }

  async loadOrganizationSettings(): Promise<void> {
    const current = await this.organizationService.getCurrentOrganization();
    if (!current) return;
    this.organizationForm.patchValue({
      name: current.organization.name,
      timezone: current.organization.timezone,
      currency: current.organization.currency,
    });
  }

  async saveOrganization(): Promise<void> {
    this.orgSaving.set(true);
    try {
      const raw = this.organizationForm.getRawValue();
      await this.organizationService.updateOrganization({
        name: raw.name.trim(),
        timezone: raw.timezone.trim(),
        currency: raw.currency.trim().toUpperCase(),
      });
      this.toastService.success('Organization updated', 'Workspace settings saved.');
    } catch {
      this.toastService.show({
        title: 'Update failed',
        description: 'Could not save organization settings.',
        variant: 'destructive',
      });
    } finally {
      this.orgSaving.set(false);
    }
  }

  async sendInvite(): Promise<void> {
    const email = this.inviteForm.controls.email.value.trim();
    if (!email) return;

    this.inviteSending.set(true);
    try {
      const invite = await this.organizationService.inviteMember(email);
      this.lastInviteToken.set(invite?.token ?? null);
      this.inviteForm.reset();
      this.toastService.success('Invite sent', `Invitation created for ${email}.`);
    } catch {
      this.toastService.show({
        title: 'Invite failed',
        description: 'Could not create invite.',
        variant: 'destructive',
      });
    } finally {
      this.inviteSending.set(false);
    }
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString();
  }

  async resendVerification(): Promise<void> {
    this.verificationSending.set(true);
    try {
      await this.authService.requestEmailVerification();
      this.toastService.success('Email sent', 'Verification email requested.');
    } catch {
      this.toastService.show({
        title: 'Request failed',
        description: 'Could not send verification email.',
        variant: 'destructive',
      });
    } finally {
      this.verificationSending.set(false);
    }
  }

  async changePassword(): Promise<void> {
    const validation = safeValidate(changePasswordSchema, this.passwordForm.getRawValue());
    if (!validation.success) {
      this.passwordErrors.set(validation.errors ?? {});
      return;
    }

    this.passwordErrors.set({});

    try {
      await this.authService.changePassword(
        validation.data!.currentPassword,
        validation.data!.newPassword,
      );
      this.passwordForm.reset();
      this.toastService.success('Password updated', 'Your password has been changed.');
    } catch {
      this.toastService.show({
        title: 'Update failed',
        description: this.authService.error() || 'Could not change password.',
        variant: 'destructive',
      });
    }
  }

  passwordFieldError(field: string): string | null {
    return this.passwordErrors()[field]?.[0] ?? null;
  }

  async revokeSession(sessionId: string): Promise<void> {
    this.revokingId.set(sessionId);
    const success = await this.sessionService.revokeSession(sessionId);
    this.revokingId.set(null);

    if (success) {
      this.toastService.success('Session revoked', 'The device has been signed out.');
    } else {
      this.toastService.show({
        title: 'Revoke failed',
        description: 'Could not revoke this session.',
        variant: 'destructive',
      });
    }
  }
}

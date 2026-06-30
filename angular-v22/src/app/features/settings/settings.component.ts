/**
 * Settings Page — profile, security, sessions, organization
 */

import { Component, computed, inject, model, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { getUserDisplayName, getUserInitials } from '@features/users/user.utils';
import { OrganizationInvite, OrganizationMember } from '@models/index';
import { AuthService, OrganizationService, SessionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    AvatarComponent,
    ButtonComponent,
    CardBodyComponent,
    CardComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
    IconComponent,
    InputComponent,
    SkeletonComponent,
    SubmitButtonComponent,
    TabsComponent,
    TabsContentComponent,
    TabsListComponent,
    TabsTriggerComponent,
} from '@shared/components';
import { ignorePromise } from '@utils/form-display.util';
import { changePasswordSchema, safeValidate } from '@utils/validators';

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
        TabsComponent,
        TabsListComponent,
        TabsTriggerComponent,
        TabsContentComponent,
        IconComponent,
    ],
    template: `
        <div class="page-shell">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">Settings</h1>
                    <p class="page-description">
                        Manage your account, security, and active sessions.
                    </p>
                </div>
            </div>

            <app-tabs [(value)]="activeTab">
                <app-tabs-list>
                    @for (tab of tabs; track tab.id) {
                        <app-tabs-trigger [value]="tab.id">{{ tab.label }}</app-tabs-trigger>
                    }
                </app-tabs-list>

                <app-tabs-content value="profile">
                    <div class="settings-panel">
                        <app-card>
                            <app-card-header>
                                <app-card-title>Profile</app-card-title>
                                <app-card-description
                                    >Your account information</app-card-description
                                >
                            </app-card-header>
                            <app-card-body contentClass="space-y-6">
                                <div class="settings-profile-header">
                                    <app-avatar [fallback]="userInitials()" size="lg" />
                                    <div class="min-w-0 space-y-1">
                                        <p class="text-sm font-medium text-foreground">
                                            {{ displayName() }}
                                        </p>
                                        <p class="truncate text-sm text-muted-foreground">
                                            {{ userEmail() }}
                                        </p>
                                    </div>
                                </div>

                                <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div class="space-y-1">
                                        <dt class="text-xs font-medium text-muted-foreground">
                                            Email verified
                                        </dt>
                                        <dd>
                                            <span
                                                [class]="
                                                    emailVerified()
                                                        ? 'badge badge-success'
                                                        : 'badge badge-warning'
                                                "
                                            >
                                                {{ emailVerified() ? 'Verified' : 'Pending' }}
                                            </span>
                                        </dd>
                                    </div>
                                    <div class="space-y-1">
                                        <dt class="text-xs font-medium text-muted-foreground">
                                            Account status
                                        </dt>
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
                    </div>
                </app-tabs-content>

                <app-tabs-content value="organization">
                    <div class="settings-panel">
                        <app-card>
                            <app-card-header>
                                <app-card-title>Organization</app-card-title>
                                <app-card-description
                                    >Workspace timezone, currency, and team
                                    invites</app-card-description
                                >
                            </app-card-header>
                            <app-card-body contentClass="space-y-6">
                                <form [formGroup]="organizationForm" class="grid max-w-md gap-4">
                                    <app-input
                                        id="org-name"
                                        label="Organization name"
                                        formControlName="name"
                                    />
                                    <app-input
                                        id="org-timezone"
                                        label="Timezone"
                                        formControlName="timezone"
                                    />
                                    <app-input
                                        id="org-currency"
                                        label="Currency"
                                        formControlName="currency"
                                    />
                                    <div>
                                        <app-button
                                            type="button"
                                            size="sm"
                                            [disabled]="orgSaving()"
                                            (clicked)="saveOrganization()"
                                        >
                                            @if (orgSaving()) {
                                                Saving...
                                            } @else {
                                                Save organization settings
                                            }
                                        </app-button>
                                    </div>
                                </form>

                                <div class="settings-section">
                                    <div class="space-y-1">
                                        <p class="text-sm font-medium text-foreground">
                                            Invite member
                                        </p>
                                        <p class="text-sm text-muted-foreground">
                                            Send an email invite to add someone to this workspace.
                                        </p>
                                    </div>
                                    <form [formGroup]="inviteForm" class="grid max-w-md gap-3">
                                        <app-input
                                            id="invite-email"
                                            type="email"
                                            label="Email"
                                            formControlName="email"
                                        />
                                        <div>
                                            <app-button
                                                type="button"
                                                size="sm"
                                                [disabled]="inviteSending()"
                                                (clicked)="sendInvite()"
                                            >
                                                @if (inviteSending()) {
                                                    Sending...
                                                } @else {
                                                    Send invite
                                                }
                                            </app-button>
                                        </div>
                                    </form>
                                    @if (lastInviteToken()) {
                                        <p
                                            class="text-xs text-muted-foreground break-all rounded-md border border-border p-3 settings-invite-token"
                                        >
                                            Invite token (dev): {{ lastInviteToken() }}
                                        </p>
                                    }
                                </div>

                                <div class="settings-section space-y-3">
                                    <div class="space-y-1">
                                        <p class="text-sm font-medium text-foreground">Members</p>
                                        <p class="text-sm text-muted-foreground">
                                            People in this workspace
                                        </p>
                                    </div>
                                    @if (membersLoading()) {
                                        <app-skeleton className="h-12 w-full rounded-lg" />
                                    } @else if (members().length === 0) {
                                        <p class="text-sm text-muted-foreground">No members found.</p>
                                    } @else {
                                        <div class="settings-session-list">
                                            @for (member of members(); track member.userId) {
                                                <div class="settings-session-row">
                                                    <div class="min-w-0 space-y-1">
                                                        <p class="text-sm font-medium text-foreground">
                                                            {{ member.user.email || member.userId }}
                                                        </p>
                                                        <p class="text-xs text-muted-foreground">
                                                            {{ member.role }} · Joined
                                                            {{ formatDate(member.joinedAt) }}
                                                        </p>
                                                    </div>
                                                    @if (
                                                        member.role !== 'OWNER' &&
                                                        canManageOrg()
                                                    ) {
                                                        <app-button
                                                            variant="outline"
                                                            size="sm"
                                                            type="button"
                                                            (clicked)="removeMember(member.userId)"
                                                        >
                                                            Remove
                                                        </app-button>
                                                    }
                                                </div>
                                            }
                                        </div>
                                    }
                                </div>

                                @if (canManageOrg()) {
                                    <div class="settings-section space-y-3">
                                        <div class="space-y-1">
                                            <p class="text-sm font-medium text-foreground">
                                                Pending invites
                                            </p>
                                        </div>
                                        @if (pendingInvites().length === 0) {
                                            <p class="text-sm text-muted-foreground">
                                                No pending invites.
                                            </p>
                                        } @else {
                                            <div class="settings-session-list">
                                                @for (invite of pendingInvites(); track invite.id) {
                                                    <div class="settings-session-row">
                                                        <div class="min-w-0 space-y-1">
                                                            <p
                                                                class="text-sm font-medium text-foreground"
                                                            >
                                                                {{ invite.email }}
                                                            </p>
                                                            <p class="text-xs text-muted-foreground">
                                                                {{ invite.role }} · Expires
                                                                {{ formatDate(invite.expiresAt) }}
                                                            </p>
                                                        </div>
                                                        <app-button
                                                            variant="outline"
                                                            size="sm"
                                                            type="button"
                                                            (clicked)="revokeInvite(invite.id)"
                                                        >
                                                            Revoke
                                                        </app-button>
                                                    </div>
                                                }
                                            </div>
                                        }
                                    </div>
                                }
                            </app-card-body>
                        </app-card>
                    </div>
                </app-tabs-content>

                <app-tabs-content value="security">
                    <div class="settings-panel">
                        <app-card>
                            <app-card-header>
                                <app-card-title>Security</app-card-title>
                                <app-card-description>Update your password</app-card-description>
                            </app-card-header>
                            <app-card-body>
                                <form
                                    [formGroup]="passwordForm"
                                    (ngSubmit)="changePassword()"
                                    class="max-w-md space-y-4"
                                >
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
                    </div>
                </app-tabs-content>

                <app-tabs-content value="sessions">
                    <div class="settings-panel">
                        <app-card>
                            <app-card-header [row]="true">
                                <div class="min-w-0 space-y-1">
                                    <app-card-title>Active sessions</app-card-title>
                                    <app-card-description
                                        >Devices where you're currently signed
                                        in</app-card-description
                                    >
                                </div>
                        <app-button
                            variant="outline"
                            size="sm"
                            type="button"
                            (clicked)="sessionService.reload()"
                        >
                            Refresh
                        </app-button>
                        <app-button
                            variant="outline"
                            size="sm"
                            type="button"
                            (clicked)="logoutAll()"
                        >
                            Sign out all devices
                        </app-button>
                            </app-card-header>
                            <app-card-body [flush]="true" contentClass="!p-0">
                                @if (sessionService.isLoading()) {
                                    <div class="space-y-3 p-6">
                                        @for (_ of skeletonItems; track $index) {
                                            <app-skeleton className="h-16 w-full rounded-lg" />
                                        }
                                    </div>
                                } @else if (sessionService.sessions().length === 0) {
                                    <div class="empty-state py-16">
                                        <div class="flex-table-empty-icon" aria-hidden="true">
                                            <app-icon
                                                name="shield"
                                                [size]="20"
                                                className="text-muted-foreground"
                                            />
                                        </div>
                                        <p class="empty-state-title">No active sessions</p>
                                        <p class="empty-state-description">
                                            Signed-in devices will appear here.
                                        </p>
                                    </div>
                                } @else {
                                    <div class="settings-session-list">
                                        @for (
                                            session of sessionService.sessions();
                                            track session.id
                                        ) {
                                            <div class="settings-session-row">
                                                <div class="min-w-0 space-y-1">
                                                    <p class="text-sm font-medium text-foreground">
                                                        {{ session.deviceName || 'Unknown device' }}
                                                        @if (session.current) {
                                                            <span class="badge badge-success ml-2"
                                                                >Current</span
                                                            >
                                                        }
                                                    </p>
                                                    <p
                                                        class="truncate text-xs text-muted-foreground"
                                                    >
                                                        {{ session.ipAddress || '—' }} · Last active
                                                        {{ formatDate(session.lastActiveAt) }}
                                                    </p>
                                                </div>
                                                @if (!session.current) {
                                                    <app-button
                                                        variant="outline"
                                                        size="sm"
                                                        type="button"
                                                        class="w-full sm:w-auto shrink-0"
                                                        [disabled]="revokingId() === session.id"
                                                        (clicked)="revokeSession(session.id)"
                                                    >
                                                        Revoke
                                                    </app-button>
                                                }
                                            </div>
                                        }
                                    </div>
                                }
                            </app-card-body>
                        </app-card>
                    </div>
                </app-tabs-content>
            </app-tabs>
        </div>
    `,
})
export class SettingsComponent implements OnInit {
    authService = inject(AuthService);
    sessionService = inject(SessionService);
    private readonly organizationService = inject(OrganizationService);
    private readonly toastService = inject(ToastService);
    private readonly router = inject(Router);
    private readonly fb = inject(NonNullableFormBuilder);

    readonly tabs: { id: SettingsTab; label: string }[] = [
        { id: 'profile', label: 'Profile' },
        { id: 'organization', label: 'Organization' },
        { id: 'security', label: 'Security' },
        { id: 'sessions', label: 'Sessions' },
    ];

    readonly skeletonItems = Array.from({ length: 3 }, (_, i) => i);

    activeTab = model<SettingsTab>('profile');
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
    members = signal<OrganizationMember[]>([]);
    pendingInvites = signal<OrganizationInvite[]>([]);
    membersLoading = signal(false);
    currentOrgId = signal<string | null>(null);
    currentOrgRole = signal<'OWNER' | 'ADMIN' | 'MEMBER' | null>(null);

    canManageOrg = computed(() => {
        const role = this.currentOrgRole();
        return role === 'OWNER' || role === 'ADMIN';
    });

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
        ignorePromise(this.authService.refreshProfile());
        this.sessionService.reload();
        ignorePromise(this.loadOrganizationSettings());
        ignorePromise(this.loadMembers());
    }

    async loadMembers(): Promise<void> {
        this.membersLoading.set(true);
        try {
            const current = await this.organizationService.getCurrentOrganization();
            this.currentOrgId.set(current?.organizationId ?? null);
            const [members, invites] = await Promise.all([
                this.organizationService.listMembers(),
                this.canManageOrg()
                    ? this.organizationService.listPendingInvites()
                    : Promise.resolve([]),
            ]);
            this.members.set(members);
            this.pendingInvites.set(invites);
        } catch {
            this.members.set([]);
            this.pendingInvites.set([]);
        } finally {
            this.membersLoading.set(false);
        }
    }

    async loadOrganizationSettings(): Promise<void> {
        const current = await this.organizationService.getCurrentOrganization();
        if (!current) return;
        this.organizationForm.patchValue({
            name: current.organization.name,
            timezone: current.organization.timezone,
            currency: current.organization.currency,
        });
        this.currentOrgId.set(current.organizationId);
        this.currentOrgRole.set(current.role);
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
            ignorePromise(this.loadMembers());
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

    formatDate(value: string | Date): string {
        return new Date(value).toLocaleString();
    }

    async removeMember(userId: string): Promise<void> {
        const orgId = this.currentOrgId();
        if (!orgId) return;

        try {
            await this.organizationService.removeMember(orgId, userId);
            this.toastService.success('Member removed', 'User removed from workspace.');
            ignorePromise(this.loadMembers());
        } catch {
            this.toastService.show({
                title: 'Remove failed',
                description: 'Could not remove member.',
                variant: 'destructive',
            });
        }
    }

    async revokeInvite(inviteId: string): Promise<void> {
        try {
            await this.organizationService.revokeInvite(inviteId);
            this.toastService.success('Invite revoked', 'Pending invite removed.');
            ignorePromise(this.loadMembers());
        } catch {
            this.toastService.show({
                title: 'Revoke failed',
                description: 'Could not revoke invite.',
                variant: 'destructive',
            });
        }
    }

    async logoutAll(): Promise<void> {
        await this.authService.signOutAll();
        this.toastService.success('Signed out', 'All devices have been signed out.');
        ignorePromise(this.router.navigate(['/auth/signin']));
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
            const { currentPassword, newPassword } = validation.data;
            await this.authService.changePassword(currentPassword, newPassword);
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

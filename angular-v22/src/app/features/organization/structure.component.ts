/**
 * Organization Structure — branches, departments, teams, reporting hierarchy
 */

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, resource, signal } from '@angular/core'
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { EmployeeProfile, OrgUnitMember, OrgUnitNode, OrgUnitType } from '@models/index';
import { OrgUnitService, ToastService } from '@services/index';
import {
    ButtonComponent,
    CardBodyComponent,
    CardComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CheckboxComponent,
    InputComponent,
    LoaderComponent,
    SelectComponent,
    SelectOption,
    SkeletonComponent,
    SubmitButtonComponent,
    TabsComponent,
    TabsContentComponent,
    TabsListComponent,
    TabsTriggerComponent,
} from '@shared/components';
import { runResourceLoader } from '@shared/utils/resource-error';

type StructureTab = 'units' | 'employees' | 'hierarchy';

const UNIT_TYPE_OPTIONS: SelectOption[] = [
    { label: 'Branch', value: 'BRANCH' },
    { label: 'Department', value: 'DEPARTMENT' },
    { label: 'Team', value: 'TEAM' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-organization-structure',
    imports: [
        NgTemplateOutlet,
        ReactiveFormsModule,
        CardComponent,
        CardHeaderComponent,
        CardTitleComponent,
        CardDescriptionComponent,
        CardBodyComponent,
        ButtonComponent,
        InputComponent,
        CheckboxComponent,
        LoaderComponent,
        SelectComponent,
        SkeletonComponent,
        SubmitButtonComponent,
        TabsComponent,
        TabsListComponent,
        TabsTriggerComponent,
        TabsContentComponent,
    ],
    template: `
        <div class="page-shell">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">Organization structure</h1>
                    <p class="page-description">
                        Manage branches, departments, teams, and employee reporting lines.
                    </p>
                </div>
            </div>

            <app-tabs [(value)]="activeTab">
                <app-tabs-list>
                    <app-tabs-trigger value="units">Units</app-tabs-trigger>
                    <app-tabs-trigger value="employees">Employees</app-tabs-trigger>
                    <app-tabs-trigger value="hierarchy">Reporting hierarchy</app-tabs-trigger>
                </app-tabs-list>

                <app-tabs-content value="units">
                    <div class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                        <app-card>
                            <app-card-header [row]="true">
                                <div class="min-w-0 space-y-1">
                                    <app-card-title>Org unit tree</app-card-title>
                                    <app-card-description
                                        >Branches contain departments; departments contain
                                        teams</app-card-description
                                    >
                                </div>
                                <app-button size="sm" (clicked)="showCreateForm.set(true)"
                                    >Add unit</app-button
                                >
                            </app-card-header>
                            <app-card-body>
                                @if (treeResource.isLoading()) {
                                    <app-skeleton className="h-40 w-full rounded-lg" />
                                } @else if (unitTree().length === 0) {
                                    <p class="text-sm text-muted-foreground">
                                        No org units yet. Create a branch to get started.
                                    </p>
                                } @else {
                                    <ul class="org-unit-tree">
                                        @for (node of unitTree(); track node.id) {
                                            <li>
                                                <ng-container
                                                    *ngTemplateOutlet="
                                                        unitNode;
                                                        context: { $implicit: node, depth: 0 }
                                                    "
                                                />
                                            </li>
                                        }
                                    </ul>
                                }
                            </app-card-body>
                        </app-card>

                        @if (showCreateForm()) {
                            <app-card>
                                <app-card-header>
                                    <app-card-title>Create org unit</app-card-title>
                                </app-card-header>
                                <app-card-body>
                                    <form
                                        [formGroup]="createForm"
                                        class="space-y-4"
                                        (ngSubmit)="createUnit()"
                                    >
                                        <app-select
                                            id="unit-type"
                                            label="Type"
                                            formControlName="type"
                                            [options]="unitTypeOptions"
                                        />
                                        <app-input
                                            id="unit-name"
                                            label="Name"
                                            formControlName="name"
                                            [required]="true"
                                        />
                                        <app-input
                                            id="unit-code"
                                            label="Code"
                                            formControlName="code"
                                            placeholder="HQ"
                                        />
                                        <app-select
                                            id="unit-parent"
                                            label="Parent unit"
                                            formControlName="parentId"
                                            [options]="parentOptions()"
                                            placeholder="None (branch only)"
                                        />
                                        <app-submit-button
                                            label="Create unit"
                                            loadingLabel="Creating..."
                                            [loading]="saving()"
                                        />
                                    </form>
                                </app-card-body>
                            </app-card>
                        }
                    </div>
                </app-tabs-content>

                <app-tabs-content value="employees">
                    <app-card>
                        <app-card-header>
                            <app-card-title>Employees</app-card-title>
                            <app-card-description
                                >Job titles, employee codes, managers, and unit
                                assignments</app-card-description
                            >
                        </app-card-header>
                        <app-card-body>
                            @if (employeesResource.isLoading()) {
                                <app-skeleton className="h-32 w-full rounded-lg" />
                            } @else if (employees().length === 0) {
                                <p class="text-sm text-muted-foreground">No employees found.</p>
                            } @else {
                                <div class="overflow-x-auto">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>Employee</th>
                                                <th>Code</th>
                                                <th>Title</th>
                                                <th>Manager</th>
                                                <th>Units</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @for (employee of employees(); track employee.userId) {
                                                <tr>
                                                    <td>{{ employee.user.email }}</td>
                                                    <td>{{ employee.employeeCode || '—' }}</td>
                                                    <td>{{ employee.jobTitle || '—' }}</td>
                                                    <td>{{ employee.manager?.email || '—' }}</td>
                                                    <td>
                                                        @for (
                                                            unit of employee.units;
                                                            track unit.id
                                                        ) {
                                                            <span class="badge badge-secondary mr-1">
                                                                {{ unit.name }}
                                                            </span>
                                                        }
                                                    </td>
                                                    <td>
                                                        <app-button
                                                            size="sm"
                                                            variant="outline"
                                                            (clicked)="editEmployee(employee)"
                                                            >Edit</app-button
                                                        >
                                                    </td>
                                                </tr>
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            }
                        </app-card-body>
                    </app-card>
                </app-tabs-content>

                <app-tabs-content value="hierarchy">
                    <app-card>
                        <app-card-header>
                            <app-card-title>Reporting hierarchy</app-card-title>
                            <app-card-description
                                >Manager → direct reports tree</app-card-description
                            >
                        </app-card-header>
                        <app-card-body>
                            @if (hierarchyResource.isLoading()) {
                                <app-skeleton className="h-32 w-full rounded-lg" />
                            } @else if (hierarchy().length === 0) {
                                <p class="text-sm text-muted-foreground">
                                    No reporting lines configured yet.
                                </p>
                            } @else {
                                <ul class="org-hierarchy-tree">
                                    @for (node of hierarchy(); track node.userId) {
                                        <li>
                                            <ng-container
                                                *ngTemplateOutlet="
                                                    hierarchyNode;
                                                    context: { $implicit: node, depth: 0 }
                                                "
                                            />
                                        </li>
                                    }
                                </ul>
                            }
                        </app-card-body>
                    </app-card>
                </app-tabs-content>
            </app-tabs>
        </div>

        @if (selectedUnit()) {
            <div
                class="dialog-backdrop"
                tabindex="0"
                role="button"
                aria-label="Close unit members dialog"
                (click)="closeUnitMembers()"
                (keydown.enter)="closeUnitMembers()"
                (keydown.space)="closeUnitMembers(); $event.preventDefault()"
            ></div>
            <div class="dialog-panel" role="dialog" aria-modal="true">
                <h2 class="text-lg font-semibold">Unit members</h2>
                <p class="text-sm text-muted-foreground mb-4">
                    {{ selectedUnit()?.name }}
                    <span class="badge badge-outline ml-1">{{ selectedUnit()?.type }}</span>
                </p>

                @if (loadingMembers()) {
                    <div class="dialog-loading">
                        <app-loader />
                    </div>
                } @else {
                    @if (unitMembers().length === 0) {
                        <p class="text-sm text-muted-foreground mb-4">No members assigned yet.</p>
                    } @else {
                        <ul class="mb-4 space-y-2">
                            @for (member of unitMembers(); track member.id) {
                                <li class="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                                    <div class="min-w-0">
                                        <p class="font-medium truncate">{{ member.user.email }}</p>
                                        <p class="text-xs text-muted-foreground">
                                            @if (member.title) {
                                                {{ member.title }}
                                            }
                                            @if (member.isPrimary) {
                                                @if (member.title) {
                                                    ·
                                                }
                                                Primary unit
                                            }
                                        </p>
                                    </div>
                                    <app-button
                                        size="sm"
                                        variant="ghost"
                                        (clicked)="removeMember(member.userId)"
                                        >Remove</app-button
                                    >
                                </li>
                            }
                        </ul>
                    }

                    @if (assignableEmployeeOptions().length > 0) {
                        <form
                            [formGroup]="memberForm"
                            class="space-y-4 border-t pt-4"
                            (ngSubmit)="addMember()"
                        >
                            <app-select
                                id="member-user"
                                label="Employee"
                                formControlName="userId"
                                [options]="assignableEmployeeOptions()"
                                placeholder="Select employee"
                            />
                            <app-input
                                id="member-title"
                                label="Role in unit"
                                formControlName="title"
                                placeholder="e.g. Team lead"
                            />
                            <app-checkbox
                                id="member-primary"
                                label="Primary unit for this employee"
                                formControlName="isPrimary"
                            />
                            <app-submit-button
                                label="Add member"
                                loadingLabel="Adding..."
                                [loading]="saving()"
                            />
                        </form>
                    } @else {
                        <p class="text-sm text-muted-foreground border-t pt-4">
                            All organization members are already assigned to this unit.
                        </p>
                    }
                }

                <div class="flex justify-end mt-4">
                    <app-button type="button" variant="outline" (clicked)="closeUnitMembers()"
                        >Close</app-button
                    >
                </div>
            </div>
        }

        @if (editingEmployee()) {
            <div
                class="dialog-backdrop"
                tabindex="0"
                role="button"
                aria-label="Close employee editor"
                (click)="editingEmployee.set(null)"
                (keydown.enter)="editingEmployee.set(null)"
                (keydown.space)="editingEmployee.set(null); $event.preventDefault()"
            ></div>
            <div class="dialog-panel" role="dialog" aria-modal="true">
                <h2 class="text-lg font-semibold">Edit employee profile</h2>
                <p class="text-sm text-muted-foreground mb-4">
                    {{ editingEmployee()?.user?.email }}
                </p>
                <form [formGroup]="employeeForm" class="space-y-4" (ngSubmit)="saveEmployee()">
                    <app-input id="employee-code" label="Employee code" formControlName="employeeCode" />
                    <app-input id="job-title" label="Job title" formControlName="jobTitle" />
                    <app-select
                        id="manager"
                        label="Manager"
                        formControlName="managerUserId"
                        [options]="managerOptions()"
                        placeholder="No manager"
                    />
                    <div class="flex justify-end gap-2">
                        <app-button
                            type="button"
                            variant="outline"
                            (clicked)="editingEmployee.set(null)"
                            >Cancel</app-button
                        >
                        <app-submit-button
                            label="Save"
                            loadingLabel="Saving..."
                            [loading]="saving()"
                        />
                    </div>
                </form>
            </div>
        }

        <ng-template #unitNode let-node let-depth="depth">
            <div class="org-unit-node" [style.padding-left.px]="depth * 16">
                <div class="flex items-center gap-2 py-1">
                    <span class="badge badge-outline">{{ node.type }}</span>
                    <span class="font-medium">{{ node.name }}</span>
                    @if (node.code) {
                        <span class="text-xs text-muted-foreground">{{ node.code }}</span>
                    }
                    <app-button
                        size="sm"
                        variant="outline"
                        (clicked)="openUnitMembers(node)"
                        >Members</app-button
                    >
                    <app-button
                        size="sm"
                        variant="ghost"
                        (clicked)="deleteUnit(node.id)"
                        >Delete</app-button
                    >
                </div>
                @if (node.children.length) {
                    <ul>
                        @for (child of node.children; track child.id) {
                            <li>
                                <ng-container
                                    *ngTemplateOutlet="
                                        unitNode;
                                        context: { $implicit: child, depth: depth + 1 }
                                    "
                                />
                            </li>
                        }
                    </ul>
                }
            </div>
        </ng-template>

        <ng-template #hierarchyNode let-node let-depth="depth">
            <div [style.padding-left.px]="depth * 20" class="py-1">
                <span class="font-medium">{{ node.user.email }}</span>
                @if (node.jobTitle) {
                    <span class="text-sm text-muted-foreground"> — {{ node.jobTitle }}</span>
                }
                @if (node.reports.length) {
                    <ul>
                        @for (child of node.reports; track child.userId) {
                            <li>
                                <ng-container
                                    *ngTemplateOutlet="
                                        hierarchyNode;
                                        context: { $implicit: child, depth: depth + 1 }
                                    "
                                />
                            </li>
                        }
                    </ul>
                }
            </div>
        </ng-template>
    `,
})
export class OrganizationStructureComponent {
    private readonly orgUnitService = inject(OrgUnitService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(NonNullableFormBuilder);

    readonly unitTypeOptions = UNIT_TYPE_OPTIONS;
    activeTab = signal<StructureTab>('units');
    showCreateForm = signal(false);
    saving = signal(false);
    selectedUnit = signal<OrgUnitNode | null>(null);
    unitMembers = signal<OrgUnitMember[]>([]);
    loadingMembers = signal(false);
    editingEmployee = signal<EmployeeProfile | null>(null);

    readonly treeResource = resource({
        loader: async () =>
            runResourceLoader(() => this.orgUnitService.getTree(), {
                fallback: [] as OrgUnitNode[],
                logMessage: 'Failed to load org unit tree:',
            }),
    });

    readonly employeesResource = resource({
        loader: async () =>
            runResourceLoader(() => this.orgUnitService.listEmployees(), {
                fallback: [] as EmployeeProfile[],
                logMessage: 'Failed to load employees:',
            }),
    });

    readonly hierarchyResource = resource({
        loader: async () =>
            runResourceLoader(() => this.orgUnitService.getHierarchy(), {
                fallback: [],
                logMessage: 'Failed to load hierarchy:',
            }),
    });

    readonly unitTree = computed(() => this.treeResource.value() ?? []);
    readonly employees = computed(() => this.employeesResource.value() ?? []);
    readonly hierarchy = computed(() => this.hierarchyResource.value() ?? []);

    readonly flatUnits = computed(() => flattenUnits(this.unitTree()));

    readonly parentOptions = computed((): SelectOption[] =>
        this.flatUnits().map((unit) => ({
            label: `${unit.type}: ${unit.name}`,
            value: unit.id,
        })),
    );

    readonly managerOptions = computed((): SelectOption[] =>
        this.employees().map((employee) => ({
            label: employee.user.email ?? employee.userId,
            value: employee.userId,
        })),
    );

    readonly assignableEmployeeOptions = computed((): SelectOption[] => {
        const assigned = new Set(this.unitMembers().map((member) => member.userId));
        return this.employees()
            .filter((employee) => !assigned.has(employee.userId))
            .map((employee) => ({
                label: employee.user.email ?? employee.userId,
                value: employee.userId,
            }));
    });

    createForm = this.fb.group({
        type: this.fb.control<OrgUnitType>('BRANCH', Validators.required),
        name: this.fb.control('', Validators.required),
        code: this.fb.control(''),
        parentId: this.fb.control(''),
    });

    employeeForm = this.fb.group({
        employeeCode: this.fb.control(''),
        jobTitle: this.fb.control(''),
        managerUserId: this.fb.control(''),
    });

    memberForm = this.fb.group({
        userId: this.fb.control('', Validators.required),
        title: this.fb.control(''),
        isPrimary: this.fb.control(false),
    });

    reloadAll(): void {
        this.treeResource.reload();
        this.employeesResource.reload();
        this.hierarchyResource.reload();
    }

    async createUnit(): Promise<void> {
        if (this.createForm.invalid) return;
        this.saving.set(true);
        try {
            const value = this.createForm.getRawValue();
            await this.orgUnitService.createUnit({
                type: value.type,
                name: value.name,
                code: value.code || undefined,
                parentId: value.parentId || undefined,
            });
            this.createForm.reset({ type: 'BRANCH', name: '', code: '', parentId: '' });
            this.showCreateForm.set(false);
            this.toastService.success('Unit created', 'Organization unit added.');
            this.reloadAll();
        } catch {
            this.toastService.error('Create failed', 'Could not create org unit.');
        } finally {
            this.saving.set(false);
        }
    }

    async deleteUnit(unitId: string): Promise<void> {
        this.saving.set(true);
        try {
            await this.orgUnitService.deleteUnit(unitId);
            this.toastService.success('Unit deleted', 'Organization unit removed.');
            this.reloadAll();
        } catch {
            this.toastService.error('Delete failed', 'Remove child units first.');
        } finally {
            this.saving.set(false);
        }
    }

    async openUnitMembers(unit: OrgUnitNode): Promise<void> {
        this.selectedUnit.set(unit);
        this.memberForm.reset({ userId: '', title: '', isPrimary: false });
        this.loadingMembers.set(true);
        try {
            const members = await this.orgUnitService.listUnitMembers(unit.id);
            this.unitMembers.set(members);
        } catch {
            this.toastService.error('Load failed', 'Could not load unit members.');
            this.selectedUnit.set(null);
        } finally {
            this.loadingMembers.set(false);
        }
    }

    closeUnitMembers(): void {
        this.selectedUnit.set(null);
        this.unitMembers.set([]);
    }

    async addMember(): Promise<void> {
        const unit = this.selectedUnit();
        if (!unit || this.memberForm.invalid) return;

        this.saving.set(true);
        try {
            const value = this.memberForm.getRawValue();
            await this.orgUnitService.addUnitMember(unit.id, {
                userId: value.userId,
                title: value.title || undefined,
                isPrimary: value.isPrimary,
            });
            this.memberForm.reset({ userId: '', title: '', isPrimary: false });
            const members = await this.orgUnitService.listUnitMembers(unit.id);
            this.unitMembers.set(members);
            this.toastService.success('Member added', 'Employee assigned to unit.');
            this.employeesResource.reload();
        } catch {
            this.toastService.error('Add failed', 'Could not assign employee to unit.');
        } finally {
            this.saving.set(false);
        }
    }

    async removeMember(userId: string): Promise<void> {
        const unit = this.selectedUnit();
        if (!unit) return;

        this.saving.set(true);
        try {
            await this.orgUnitService.removeUnitMember(unit.id, userId);
            const members = await this.orgUnitService.listUnitMembers(unit.id);
            this.unitMembers.set(members);
            this.toastService.success('Member removed', 'Employee removed from unit.');
            this.employeesResource.reload();
        } catch {
            this.toastService.error('Remove failed', 'Could not remove employee from unit.');
        } finally {
            this.saving.set(false);
        }
    }

    editEmployee(employee: EmployeeProfile): void {
        this.editingEmployee.set(employee);
        this.employeeForm.patchValue({
            employeeCode: employee.employeeCode ?? '',
            jobTitle: employee.jobTitle ?? '',
            managerUserId: employee.managerUserId ?? '',
        });
    }

    async saveEmployee(): Promise<void> {
        const employee = this.editingEmployee();
        if (!employee) return;

        this.saving.set(true);
        try {
            const value = this.employeeForm.getRawValue();
            await this.orgUnitService.updateEmployeeProfile(employee.userId, {
                employeeCode: value.employeeCode || null,
                jobTitle: value.jobTitle || null,
                managerUserId: value.managerUserId || null,
            });
            this.editingEmployee.set(null);
            this.toastService.success('Profile updated', 'Employee profile saved.');
            this.reloadAll();
        } catch {
            this.toastService.error('Update failed', 'Could not update employee profile.');
        } finally {
            this.saving.set(false);
        }
    }
}

function flattenUnits(nodes: OrgUnitNode[]): OrgUnitNode[] {
    const result: OrgUnitNode[] = [];
    const walk = (items: OrgUnitNode[]) => {
        for (const item of items) {
            result.push(item);
            walk(item.children);
        }
    };
    walk(nodes);
    return result;
}

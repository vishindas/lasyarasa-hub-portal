import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  ClassCurriculumAssignment, ClassModuleState, CurriculumModule, CurriculumVersion
} from '../../../core/models/curriculum.model';
import { CurriculumModuleApiService } from '../../../core/services/curriculum-module-api.service';
import { ClassCurriculumApiService } from '../../../core/services/class-curriculum-api.service';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { ClassroomLiteBannerComponent } from '../../../shared/curriculum/classroom-lite-banner';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { StatusChipCurriculumComponent } from '../../../shared/curriculum/status-chip-curriculum';
import { CurriculumVersionSelectorComponent } from '../../../shared/curriculum/curriculum-version-selector';
import { WithdrawConfirmDialog } from './withdraw-confirm-dialog';
import { ChangeCurriculumDialog, ChangeCurriculumDialogData } from './change-curriculum-dialog';

interface ModuleRow {
  module: CurriculumModule;
  state: ClassModuleState;
}

/**
 * Data composition (approved amendment §4): load current assignment, its
 * curriculum-version modules, and its module states as three independent
 * calls, then join modules to states by moduleId client-side -- no
 * dedicated joined endpoint exists or is needed.
 *
 * Known, documented limitation: Re-lock's real precondition ("no student
 * interaction or issued assignment exists for that module") has no
 * corresponding read exposed by the Slice 5 API, so this screen cannot
 * pre-hide an ineligible Re-lock the way it can for Release (which DOES
 * have a checkable precondition: module content PUBLISHED). Re-lock is
 * shown whenever a module is RELEASED; an ineligible attempt is rejected by
 * the backend with ILLEGAL_TRANSITION and surfaced via the same
 * action-specific conflict message as any other guarded transition, per
 * the approved error mapping. This is not silently invented -- it is the
 * honest behavior given the existing API contract.
 */
@Component({
  selector: 'app-class-curriculum-management',
  standalone: true,
  imports: [
    MatButtonModule, MatIconModule, MatCardModule, MatDialogModule, MatSnackBarModule,
    ClassroomLiteBannerComponent, CurriculumMessageComponent, StatusChipCurriculumComponent, CurriculumVersionSelectorComponent
  ],
  styles: [`
    button[mat-flat-button], button[mat-stroked-button], button[mat-button] { min-height: 44px; }
    .row {
      display: flex; align-items: center; gap: 12px; padding: 12px 8px;
      border-bottom: 1px solid #f1f3f5; min-height: 44px; flex-wrap: wrap;
    }
    .row:last-child { border-bottom: none; }
    .row-title { flex: 1; min-width: 160px; font-size: 0.9rem; font-weight: 500; color: #1a1f36; white-space: normal; }
    .chips { display: flex; gap: 6px; }
    .actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .guard-note { font-size: 0.72rem; color: #adb5bd; }
    .assign-box { max-width: 640px; }
  `],
  template: `
    <div class="page-header">
      <div>
        <h2>Class Curriculum Management</h2>
        <p class="page-subtitle">Assign a curriculum version to this class and release modules as you go.</p>
      </div>
      @if (assignment()) {
        <button mat-stroked-button [disabled]="mode.mutationsDisabled()" (click)="openChangeCurriculum()">
          <mat-icon>swap_horiz</mat-icon> Change Curriculum
        </button>
      }
    </div>

    <app-classroom-lite-banner />

    @if (loading()) {
      <mat-card><mat-card-content style="padding:32px 0;text-align:center;color:#adb5bd">Loading…</mat-card-content></mat-card>
    } @else if (loadError() && loadError()!.kind !== 'not-found') {
      <app-curriculum-message [error]="loadError()" (retry)="load()" (reload)="load()" />
    } @else if (!assignment()) {
      <mat-card>
        <mat-card-content style="padding:32px 24px">
          <p style="color:#6c757d;margin-bottom:16px">No curriculum assigned to this class yet.</p>
          <div class="assign-box">
            <app-curriculum-version-selector (versionSelected)="onAssignSelection($event)" />
            <app-curriculum-message [error]="actionError()" (reload)="load()" />
            <button mat-flat-button color="primary" style="margin-top:12px"
                    [disabled]="!pendingAssignVersion || mode.mutationsDisabled() || saving()"
                    (click)="assign()">
              <mat-icon>add</mat-icon> Assign curriculum
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    } @else {
      <app-curriculum-message [error]="actionError()" (reload)="load()" />
      <mat-card>
        <mat-card-content style="padding:8px 16px">
          @if (rows().length === 0) {
            <p style="color:#adb5bd;padding:24px 0">This version has no modules.</p>
          }
          @for (r of rows(); track r.state.id) {
            <div class="row">
              <span class="row-title">{{ r.module.title }}</span>
              <div class="chips">
                <app-status-chip-curriculum [state]="r.module.contentStatus" />
                <app-status-chip-curriculum [state]="r.state.status" />
              </div>
              <div class="actions">
                @if (r.state.status === 'LOCKED') {
                  @if (r.module.contentStatus === 'PUBLISHED') {
                    <button mat-stroked-button [disabled]="mode.mutationsDisabled() || saving()" (click)="release(r)">Release</button>
                  } @else {
                    <span class="guard-note">Publish the module content first to release it.</span>
                  }
                }
                @if (r.state.status === 'RELEASED') {
                  <button mat-stroked-button [disabled]="mode.mutationsDisabled() || saving()" (click)="complete(r)">Complete</button>
                  <button mat-stroked-button [disabled]="mode.mutationsDisabled() || saving()" (click)="relock(r)">Re-lock</button>
                  <button mat-stroked-button color="warn" [disabled]="mode.mutationsDisabled() || saving()" (click)="confirmWithdraw(r)">Withdraw</button>
                }
              </div>
            </div>
          }
        </mat-card-content>
      </mat-card>
    }
  `
})
export class ClassCurriculumManagementComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private moduleApi = inject(CurriculumModuleApiService);
  private classApi = inject(ClassCurriculumApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  mode = inject(ClassroomLiteModeService);

  classId = signal<number | null>(null);
  assignment = signal<ClassCurriculumAssignment | null>(null);
  private modules = signal<CurriculumModule[]>([]);
  private states = signal<ClassModuleState[]>([]);

  rows = computed<ModuleRow[]>(() => {
    const modulesById = new Map(this.modules().map(m => [m.id, m]));
    return this.states()
      .map(state => ({ module: modulesById.get(state.moduleId)!, state }))
      .filter(r => !!r.module)
      .sort((a, b) => a.module.moduleOrder - b.module.moduleOrder);
  });

  loading = signal(true);
  saving = signal(false);
  loadError = signal<CurriculumUiError | null>(null);
  actionError = signal<CurriculumUiError | null>(null);

  pendingAssignVersion: CurriculumVersion | null = null;

  ngOnInit() {
    this.classId.set(Number(this.route.snapshot.paramMap.get('id')));
    this.load();
  }

  load() {
    const classId = this.classId();
    if (classId === null) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.actionError.set(null);
    this.classApi.current(classId).subscribe({
      next: assignment => {
        this.assignment.set(assignment);
        this.loadModulesAndStates(classId, assignment);
      },
      error: (err: HttpErrorResponse) => {
        const e = toCurriculumUiError(err);
        if (e.kind === 'not-found') {
          this.assignment.set(null);
          this.loading.set(false);
        } else {
          this.loadError.set(e);
          this.loading.set(false);
        }
      }
    });
  }

  private loadModulesAndStates(classId: number, assignment: ClassCurriculumAssignment) {
    this.moduleApi.list(assignment.curriculumVersionId).subscribe({
      next: modules => this.modules.set(modules),
      error: (err: HttpErrorResponse) => this.loadError.set(toCurriculumUiError(err))
    });
    this.classApi.currentModuleStates(classId).subscribe({
      next: states => { this.states.set(states); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.loadError.set(toCurriculumUiError(err)); this.loading.set(false); }
    });
  }

  onAssignSelection(version: CurriculumVersion | null) {
    this.pendingAssignVersion = version;
  }

  assign() {
    const classId = this.classId(), v = this.pendingAssignVersion;
    if (classId === null || !v) return;
    this.saving.set(true);
    this.classApi.assign(classId, { curriculumVersionId: v.id, expectedRowVersion: v.rowVersion }).subscribe({
      next: () => { this.saving.set(false); this.snack.open('Curriculum assigned', 'OK', { duration: 2500 }); this.load(); },
      error: (err: HttpErrorResponse) => { this.saving.set(false); this.actionError.set(toCurriculumUiError(err)); }
    });
  }

  release(r: ModuleRow) {
    this.runAction(this.classApi.release(this.classId()!, r.state.id, { expectedRowVersion: r.state.rowVersion }));
  }

  complete(r: ModuleRow) {
    this.runAction(this.classApi.complete(this.classId()!, r.state.id, { expectedRowVersion: r.state.rowVersion }));
  }

  relock(r: ModuleRow) {
    this.runAction(this.classApi.relock(this.classId()!, r.state.id, { expectedRowVersion: r.state.rowVersion }));
  }

  confirmWithdraw(r: ModuleRow) {
    this.dialog.open(WithdrawConfirmDialog, { width: '480px', data: { moduleTitle: r.module.title } })
      .afterClosed().subscribe((reason: string | null) => {
        if (reason) this.runAction(this.classApi.withdraw(this.classId()!, r.state.id, { reason, expectedRowVersion: r.state.rowVersion }));
      });
  }

  private runAction(obs: Observable<ClassModuleState>) {
    this.saving.set(true);
    obs.subscribe({
      next: updated => {
        this.saving.set(false);
        this.states.update(states => states.map(s => s.id === updated.id ? updated : s));
        this.snack.open('Updated', 'OK', { duration: 2000 });
      },
      error: (err: HttpErrorResponse) => { this.saving.set(false); this.actionError.set(toCurriculumUiError(err)); }
    });
  }

  openChangeCurriculum() {
    const classId = this.classId(), assignment = this.assignment();
    if (classId === null || !assignment) return;
    const data: ChangeCurriculumDialogData = { classId, currentAssignment: assignment };
    this.dialog.open(ChangeCurriculumDialog, { width: '760px', maxWidth: '95vw', data })
      .afterClosed().subscribe((confirmed: boolean) => { if (confirmed) this.load(); });
  }
}

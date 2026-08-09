import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { DanceStyle } from '../../../core/models/settings.model';
import {
  Curriculum, CurriculumVersion, CurriculumModule, ExpectedRowVersionRequest, ReorderModuleEntry
} from '../../../core/models/curriculum.model';
import { CurriculumApiService } from '../../../core/services/curriculum-api.service';
import { CurriculumModuleApiService } from '../../../core/services/curriculum-module-api.service';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { ClassroomLiteBannerComponent } from '../../../shared/curriculum/classroom-lite-banner';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { StatusChipCurriculumComponent } from '../../../shared/curriculum/status-chip-curriculum';
import { ModuleListRowComponent } from './module-list-row';
import { ArchiveConfirmDialog } from './archive-confirm-dialog';

@Component({
  selector: 'app-curriculum-builder',
  standalone: true,
  imports: [
    LowerCasePipe, FormsModule, DragDropModule, MatButtonModule, MatIconModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule, MatDialogModule,
    ClassroomLiteBannerComponent, CurriculumMessageComponent, StatusChipCurriculumComponent, ModuleListRowComponent
  ],
  styles: [`
    /* Slice 3 SS6.3 hard floor: every actionable control >= 44px, including Material's default ~36-40px buttons. */
    button[mat-flat-button], button[mat-stroked-button], button[mat-button] { min-height: 44px; }
    .builder-grid { display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start; }
    .lifecycle-rail { position: sticky; top: 16px; }
    .lifecycle-rail .action { width: 100%; margin-bottom: 8px; }
    .field-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .module-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
    .add-module-row { display: flex; gap: 8px; margin-top: 12px; align-items: flex-end; flex-wrap: wrap; }
    .cdk-drag-preview { box-shadow: 0 4px 16px rgba(0,0,0,0.2); border-radius: 8px; }
    @media (max-width: 1023px) { .builder-grid { grid-template-columns: 1fr; } .lifecycle-rail { position: static; } }
  `],
  template: `
    <div class="page-header">
      <div>
        <h2>{{ isCreate() ? 'New Curriculum' : (version()?.title || 'Curriculum Builder') }}</h2>
        <p class="page-subtitle">{{ isCreate() ? 'Set the basics, then add modules once created.' : 'Structure editor' }}</p>
      </div>
    </div>

    <app-classroom-lite-banner />

    @if (loading()) {
      <mat-card><mat-card-content style="padding:32px 0;text-align:center;color:#adb5bd">Loading…</mat-card-content></mat-card>
    } @else if (loadError()) {
      <app-curriculum-message [error]="loadError()" (retry)="load()" (reload)="load()" />
    } @else {
      <app-curriculum-message [error]="actionError()" (reload)="load()" />

      @if (isCreate()) {
        <mat-card>
          <mat-card-content style="padding-top:16px;max-width:480px">
            <div class="field-row">
              <mat-form-field appearance="outline">
                <mat-label>Dance Style</mat-label>
                <mat-select [(ngModel)]="form.danceStyleId">
                  @for (s of danceStyles(); track s.id) {
                    <mat-option [value]="s.id">{{ s.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Internal name (admin-only label)</mat-label>
                <input matInput [(ngModel)]="form.internalName" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Title (student-visible)</mat-label>
                <input matInput [(ngModel)]="form.title" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Level</mat-label>
                <input matInput [(ngModel)]="form.level" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Learning objectives</mat-label>
                <textarea matInput rows="3" [(ngModel)]="form.objectives"></textarea>
              </mat-form-field>
            </div>
            @if (fieldValidation()) {
              <p style="color:#991b1b;font-size:0.82rem">{{ fieldValidation() }}</p>
            }
            <button mat-flat-button color="primary" [disabled]="mode.mutationsDisabled() || saving()" (click)="createCurriculum()">
              <mat-icon>add</mat-icon> Create
            </button>
          </mat-card-content>
        </mat-card>
      } @else if (version(); as v) {
        <div class="builder-grid">
          <mat-card>
            <mat-card-content style="padding-top:16px">
              <p class="section-label">Structure</p>
              <div class="field-row">
                <mat-form-field appearance="outline">
                  <mat-label>Title</mat-label>
                  <input matInput [(ngModel)]="form.title" [disabled]="!isDraft()" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Level</mat-label>
                  <input matInput [(ngModel)]="form.level" [disabled]="!isDraft()" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Learning objectives</mat-label>
                  <textarea matInput rows="3" [(ngModel)]="form.objectives" [disabled]="!isDraft()"></textarea>
                </mat-form-field>
              </div>
              @if (isDraft()) {
                <button mat-stroked-button [disabled]="mode.mutationsDisabled() || saving()" (click)="saveDraft()">Save</button>
              } @else {
                <p style="color:#6c757d;font-size:0.82rem">This version is {{ v.status | lowercase }} — clone a new draft to make structural edits.</p>
              }

              <p class="section-label" style="margin-top:20px">
                Modules
                @if (modules().length === 0 && isDraft()) { <span style="color:#991b1b;font-weight:400;text-transform:none;letter-spacing:normal"> — add at least one to activate</span> }
              </p>

              @if (modules().length === 0) {
                <p style="color:#adb5bd">No modules yet.</p>
              } @else {
                <div class="module-list" cdkDropList (cdkDropListDropped)="onDrop($event)">
                  @for (m of modules(); track m.id; let i = $index) {
                    <div cdkDrag [cdkDragDisabled]="!isDraft()" [cdkDragData]="m">
                      <app-module-list-row [module]="m" [position]="i" [total]="modules().length" [disabled]="!isDraft()"
                        (open)="openModule(m)" (moveUp)="moveUp(i)" (moveDown)="moveDown(i)" />
                    </div>
                  }
                </div>
              }

              @if (isDraft()) {
                <div class="add-module-row">
                  <mat-form-field appearance="outline" style="flex:1;min-width:200px">
                    <mat-label>New module title</mat-label>
                    <input matInput [(ngModel)]="newModuleTitle" (keydown.enter)="addModule()" />
                  </mat-form-field>
                  <button mat-stroked-button [disabled]="mode.mutationsDisabled() || !newModuleTitle.trim()" (click)="addModule()">
                    <mat-icon>add</mat-icon> Add module
                  </button>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <mat-card class="lifecycle-rail">
            <mat-card-content style="padding-top:16px">
              <p class="section-label">Lifecycle</p>
              <app-status-chip-curriculum [state]="v.status" />

              <div style="margin-top:16px">
                <button mat-stroked-button class="action" (click)="openPreview()">
                  <mat-icon>visibility</mat-icon> Preview
                </button>

                @if (isDraft()) {
                  <button mat-flat-button color="primary" class="action"
                          [disabled]="mode.mutationsDisabled() || saving() || modules().length === 0"
                          (click)="activate()">
                    <mat-icon>check_circle</mat-icon> Activate
                  </button>
                  @if (modules().length === 0) {
                    <p style="color:#991b1b;font-size:0.78rem;margin-top:-4px">Add at least one module first.</p>
                  }
                }
                @if (v.status === 'ACTIVE') {
                  <button mat-stroked-button class="action" [disabled]="mode.mutationsDisabled() || saving()" (click)="cloneDraft()">
                    <mat-icon>content_copy</mat-icon> Clone New Draft Version
                  </button>
                  <button mat-stroked-button color="warn" class="action" [disabled]="mode.mutationsDisabled() || saving()" (click)="confirmArchive()">
                    <mat-icon>archive</mat-icon> Archive
                  </button>
                }
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }
    }
  `
})
export class CurriculumBuilderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(CurriculumApiService);
  private moduleApi = inject(CurriculumModuleApiService);
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private announcer = inject(LiveAnnouncer);
  mode = inject(ClassroomLiteModeService);

  isCreate = signal(false);
  curriculumId = signal<number | null>(null);
  versionId = signal<number | null>(null);

  curriculum = signal<Curriculum | null>(null);
  version = signal<CurriculumVersion | null>(null);
  modules = signal<CurriculumModule[]>([]);
  danceStyles = signal<DanceStyle[]>([]);

  loading = signal(true);
  saving = signal(false);
  loadError = signal<CurriculumUiError | null>(null);
  actionError = signal<CurriculumUiError | null>(null);
  fieldValidation = signal<string | null>(null);

  isDraft = computed(() => this.version()?.status === 'DRAFT');

  form = { danceStyleId: null as number | null, internalName: '', title: '', level: '', objectives: '' };
  newModuleTitle = '';

  ngOnInit() {
    this.http.get<DanceStyle[]>(`${environment.apiUrl}/school/settings/dance-styles`).subscribe({
      next: styles => this.danceStyles.set(styles),
      error: () => {}
    });

    const cId = this.route.snapshot.paramMap.get('curriculumId');
    if (!cId) {
      this.isCreate.set(true);
      this.loading.set(false);
      return;
    }
    this.curriculumId.set(Number(cId));
    this.versionId.set(Number(this.route.snapshot.paramMap.get('versionId')));
    this.load();
  }

  load() {
    const cId = this.curriculumId(), vId = this.versionId();
    if (cId === null || vId === null) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.actionError.set(null);
    this.api.get(cId).subscribe({
      next: c => this.curriculum.set(c),
      error: (err: HttpErrorResponse) => this.loadError.set(toCurriculumUiError(err))
    });
    this.api.getVersion(cId, vId).subscribe({
      next: v => {
        this.version.set(v);
        this.form.title = v.title;
        this.form.level = v.level ?? '';
        this.form.objectives = v.objectives ?? '';
      },
      error: (err: HttpErrorResponse) => this.loadError.set(toCurriculumUiError(err))
    });
    this.moduleApi.list(vId).subscribe({
      next: modules => {
        this.modules.set([...modules].sort((a, b) => a.moduleOrder - b.moduleOrder));
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadError.set(toCurriculumUiError(err));
        this.loading.set(false);
      }
    });
  }

  createCurriculum() {
    this.fieldValidation.set(null);
    if (!this.form.danceStyleId || !this.form.internalName.trim() || !this.form.title.trim()) {
      this.fieldValidation.set('Dance style, internal name and title are required.');
      return;
    }
    this.saving.set(true);
    this.api.create({
      danceStyleId: this.form.danceStyleId,
      internalName: this.form.internalName.trim(),
      title: this.form.title.trim(),
      level: this.form.level.trim() || null,
      objectives: this.form.objectives.trim() || null
    }).subscribe({
      next: v => {
        this.saving.set(false);
        this.snack.open('Curriculum created', 'OK', { duration: 2500 });
        this.router.navigate(['/vidya-rasa/curricula', v.curriculumId, 'versions', v.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const e = toCurriculumUiError(err);
        if (e.kind === 'validation') this.fieldValidation.set(e.message);
        else this.actionError.set(e);
      }
    });
  }

  saveDraft() {
    const v = this.version();
    if (!v) return;
    this.saving.set(true);
    this.api.updateDraftContent(v.curriculumId, v.id, {
      title: this.form.title.trim(),
      level: this.form.level.trim() || null,
      objectives: this.form.objectives.trim() || null,
      expectedRowVersion: v.rowVersion
    }).subscribe({
      next: updated => { this.version.set(updated); this.saving.set(false); this.snack.open('Saved', 'OK', { duration: 2000 }); },
      error: (err: HttpErrorResponse) => { this.saving.set(false); this.actionError.set(toCurriculumUiError(err)); }
    });
  }

  activate() {
    const v = this.version();
    if (!v) return;
    this.saving.set(true);
    this.api.activate(v.curriculumId, v.id, { expectedRowVersion: v.rowVersion }).subscribe({
      next: updated => { this.version.set(updated); this.saving.set(false); this.snack.open('Activated', 'OK', { duration: 2500 }); },
      error: (err: HttpErrorResponse) => { this.saving.set(false); this.actionError.set(toCurriculumUiError(err)); }
    });
  }

  confirmArchive() {
    const v = this.version();
    if (!v) return;
    this.dialog.open(ArchiveConfirmDialog, { width: '480px', data: { title: v.title } })
      .afterClosed().subscribe(confirmed => { if (confirmed) this.archive(); });
  }

  private archive() {
    const v = this.version();
    if (!v) return;
    this.saving.set(true);
    this.api.archive(v.curriculumId, v.id, { expectedRowVersion: v.rowVersion }).subscribe({
      next: updated => { this.version.set(updated); this.saving.set(false); this.snack.open('Archived', 'OK', { duration: 2500 }); },
      error: (err: HttpErrorResponse) => { this.saving.set(false); this.actionError.set(toCurriculumUiError(err)); }
    });
  }

  cloneDraft() {
    const v = this.version();
    if (!v) return;
    this.saving.set(true);
    this.api.clone(v.curriculumId, v.id, { expectedRowVersion: v.rowVersion }).subscribe({
      next: clone => {
        this.saving.set(false);
        this.snack.open('New draft version created', 'OK', { duration: 2500 });
        this.router.navigate(['/vidya-rasa/curricula', clone.curriculumId, 'versions', clone.id]);
      },
      error: (err: HttpErrorResponse) => { this.saving.set(false); this.actionError.set(toCurriculumUiError(err)); }
    });
  }

  addModule() {
    const vId = this.versionId();
    if (vId === null || !this.newModuleTitle.trim()) return;
    this.moduleApi.create(vId, { title: this.newModuleTitle.trim(), objectives: null, moduleOrder: this.modules().length + 1 }).subscribe({
      next: created => {
        this.modules.update(ms => [...ms, created]);
        this.newModuleTitle = '';
      },
      error: (err: HttpErrorResponse) => this.actionError.set(toCurriculumUiError(err))
    });
  }

  onDrop(event: CdkDragDrop<CurriculumModule[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const reordered = [...this.modules()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.applyReorder(reordered, event.currentIndex);
  }

  moveUp(i: number) {
    if (i === 0) return;
    const reordered = [...this.modules()];
    [reordered[i - 1], reordered[i]] = [reordered[i], reordered[i - 1]];
    this.applyReorder(reordered, i - 1);
  }

  moveDown(i: number) {
    if (i === this.modules().length - 1) return;
    const reordered = [...this.modules()];
    [reordered[i], reordered[i + 1]] = [reordered[i + 1], reordered[i]];
    this.applyReorder(reordered, i + 1);
  }

  private applyReorder(reordered: CurriculumModule[], movedToIndex: number) {
    const vId = this.versionId();
    if (vId === null) return;
    const entries: ReorderModuleEntry[] = [];
    reordered.forEach((m, idx) => {
      const newOrder = idx + 1;
      if (m.moduleOrder !== newOrder) entries.push({ moduleId: m.id, expectedRowVersion: m.rowVersion, newOrder });
    });
    if (entries.length === 0) return;
    const movedTitle = reordered[movedToIndex].title;
    this.moduleApi.reorder(vId, { entries }).subscribe({
      next: modules => {
        const sorted = [...modules].sort((a, b) => a.moduleOrder - b.moduleOrder);
        this.modules.set(sorted);
        const newPos = sorted.findIndex(m => m.title === movedTitle) + 1;
        this.announcer.announce(`${movedTitle} moved to position ${newPos} of ${sorted.length}`);
      },
      error: (err: HttpErrorResponse) => this.actionError.set(toCurriculumUiError(err))
    });
  }

  openModule(m: CurriculumModule) {
    const cId = this.curriculumId(), vId = this.versionId();
    this.router.navigate(['/vidya-rasa/curricula', cId, 'versions', vId, 'modules', m.id]);
  }

  openPreview() {
    const cId = this.curriculumId(), vId = this.versionId();
    if (cId === null || vId === null) return;
    this.router.navigate(['/vidya-rasa/curricula', cId, 'versions', vId, 'preview']);
  }
}

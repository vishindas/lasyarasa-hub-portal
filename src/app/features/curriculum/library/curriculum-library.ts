import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { environment } from '../../../../environments/environment';
import { DanceStyle } from '../../../core/models/settings.model';
import { Curriculum, CurriculumVersion } from '../../../core/models/curriculum.model';
import { CurriculumApiService } from '../../../core/services/curriculum-api.service';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { ClassroomLiteBannerComponent } from '../../../shared/curriculum/classroom-lite-banner';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { StatusChipCurriculumComponent } from '../../../shared/curriculum/status-chip-curriculum';

/**
 * Per-row version state. Deliberate departure from the prior "lazy, one
 * curriculum at a time" fetch (approved amendment §4): the default-visible
 * library now needs to know every curriculum's version statuses up front --
 * a curriculum whose every version is ARCHIVED is hidden unless "Show
 * archived" is on -- so versions are now fetched for every row in parallel
 * on load, once, and cached here. Expanding a row never re-fetches. This
 * trades one small eager fan-out (bounded by a provider's actual curriculum
 * count, never large in practice) for a correct default view; a `null`
 * `versions` value means that one row's fetch itself failed, not that it's
 * still pending -- the initial load only completes once every row's
 * versions call has settled (see `load()`).
 */
interface RowState {
  curriculum: Curriculum;
  expanded: boolean;
  loading: boolean;
  error: CurriculumUiError | null;
  versions: CurriculumVersion[] | null;
}

@Component({
  selector: 'app-curriculum-library',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatCardModule, MatSlideToggleModule, ClassroomLiteBannerComponent, CurriculumMessageComponent, StatusChipCurriculumComponent],
  styles: [`
    button[mat-flat-button], button[mat-stroked-button], button[mat-button] { min-height: 44px; }
    .row { display: flex; flex-direction: column; gap: 4px; }
    .row-header {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 14px 4px; cursor: pointer; min-height: 44px;
    }
    .row-header:focus-visible { outline: 2px solid #4f63d2; outline-offset: 2px; }
    .row-title { font-size: 0.95rem; font-weight: 600; color: #1a1f36; white-space: normal; }
    .row-sub { font-size: 0.78rem; color: #6c757d; margin-top: 2px; }
    .versions-panel { padding: 4px 4px 14px 24px; display: flex; flex-direction: column; gap: 8px; }
    .version-row { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; }
    .divider { border-bottom: 1px solid #f1f3f5; }
    @media (max-width: 767px) { .row-header { flex-wrap: wrap; } }
  `],
  template: `
    <div class="page-header">
      <div>
        <h2>Curriculum Library</h2>
        <p class="page-subtitle">Create, version and archive curricula for your school.</p>
      </div>
      @if (!mode.mutationsDisabled()) {
        <button mat-flat-button color="primary" (click)="createNew()" [disabled]="loading()">
          <mat-icon>add</mat-icon> New Curriculum
        </button>
      }
    </div>

    <app-classroom-lite-banner />

    @if (!loading() && !listError() && rows().length > 0) {
      <div style="display:flex;align-items:center;gap:8px;margin:4px 0 12px 2px">
        <mat-slide-toggle [checked]="showArchived()" (change)="showArchived.set($event.checked)">
          Show archived
        </mat-slide-toggle>
        @if (hiddenCount() > 0) {
          <span style="color:#6c757d;font-size:0.82rem">
            {{ hiddenCount() }} archived {{ hiddenCount() === 1 ? 'curriculum' : 'curricula' }} hidden
          </span>
        }
      </div>
    }

    @if (loading()) {
      <mat-card><mat-card-content style="padding:32px 0;text-align:center;color:#adb5bd">Loading…</mat-card-content></mat-card>
    } @else if (listError()) {
      <app-curriculum-message [error]="listError()" (retry)="load()" (reload)="load()" />
    } @else if (rows().length === 0) {
      <mat-card>
        <mat-card-content style="padding:48px 24px;text-align:center">
          <p style="color:#6c757d;margin-bottom:16px">No curricula yet — create one to get started.</p>
          @if (!mode.mutationsDisabled()) {
            <button mat-flat-button color="primary" (click)="createNew()">
              <mat-icon>add</mat-icon> New Curriculum
            </button>
          }
        </mat-card-content>
      </mat-card>
    } @else if (visibleRows().length === 0) {
      <mat-card>
        <mat-card-content style="padding:48px 24px;text-align:center">
          <p style="color:#6c757d">Every curriculum here is archived. Turn on "Show archived" above to see it.</p>
        </mat-card-content>
      </mat-card>
    } @else {
      <mat-card>
        <mat-card-content style="padding:8px 16px">
          @for (row of visibleRows(); track row.curriculum.id; let last = $last) {
            <div class="row" [class.divider]="!last">
              <div class="row-header" tabindex="0" role="button"
                   [attr.aria-expanded]="row.expanded"
                   [attr.aria-label]="'Toggle versions for ' + row.curriculum.internalName"
                   (click)="toggleRow(row)" (keydown.enter)="toggleRow(row)" (keydown.space)="toggleRow(row); $event.preventDefault()">
                <div>
                  <div class="row-title">{{ row.curriculum.internalName }}</div>
                  <div class="row-sub">{{ danceStyleName(row.curriculum.danceStyleId) }}</div>
                </div>
                <mat-icon aria-hidden="true">{{ row.expanded ? 'expand_less' : 'expand_more' }}</mat-icon>
              </div>
              @if (row.expanded) {
                <div class="versions-panel">
                  @if (row.loading) {
                    <span style="color:#adb5bd">Loading versions…</span>
                  } @else if (row.error) {
                    <app-curriculum-message [error]="row.error" (retry)="loadVersions(row)" (reload)="loadVersions(row)" />
                  } @else if (row.versions && row.versions.length === 0) {
                    <span style="color:#adb5bd">No versions yet.</span>
                  } @else {
                    @for (v of row.versions; track v.id) {
                      <div class="version-row">
                        <app-status-chip-curriculum [state]="v.status" />
                        <span>v{{ v.versionNumber }} — {{ v.title }}</span>
                        <button mat-button (click)="openVersion(row.curriculum.id, v.id)">Open</button>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          }
        </mat-card-content>
      </mat-card>
    }
  `
})
export class CurriculumLibraryComponent implements OnInit {
  private api = inject(CurriculumApiService);
  private http = inject(HttpClient);
  private router = inject(Router);
  mode = inject(ClassroomLiteModeService);

  loading = signal(true);
  listError = signal<CurriculumUiError | null>(null);
  rows = signal<RowState[]>([]);
  showArchived = signal(false);
  private danceStyles = signal<Map<number, string>>(new Map());

  /**
   * A row is archived-only when its versions loaded successfully, at least
   * one exists, and every one is ARCHIVED. A row whose versions call itself
   * failed (`versions === null`, `error` set) or that has none at all (never
   * actually possible -- create() always seeds one DRAFT version -- but
   * guarded rather than assumed) is never hidden: visibility defaults to
   * showing a curriculum whenever its true status can't be established,
   * not hiding it.
   */
  private isArchivedOnly(row: RowState): boolean {
    return !!row.versions && row.versions.length > 0 && row.versions.every(v => v.status === 'ARCHIVED');
  }

  visibleRows = computed(() => {
    const rows = this.rows();
    return this.showArchived() ? rows : rows.filter(r => !this.isArchivedOnly(r));
  });

  hiddenCount = computed(() => this.rows().filter(r => this.isArchivedOnly(r)).length);

  ngOnInit() {
    this.http.get<DanceStyle[]>(`${environment.apiUrl}/school/settings/dance-styles`).subscribe({
      next: styles => this.danceStyles.set(new Map(styles.map(s => [s.id!, s.name]))),
      error: () => {} // non-critical to the list itself; rows fall back to a numeric id below
    });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.listError.set(null);
    this.api.list().subscribe({
      next: curricula => {
        if (curricula.length === 0) {
          this.rows.set([]);
          this.loading.set(false);
          return;
        }
        // Fetch every curriculum's versions in parallel, once, so the
        // default (archived-hidden) view is correct before anything is
        // expanded -- see the RowState comment above for why this departs
        // from the prior fully-lazy fetch. A single row's failure never
        // fails the whole list: it surfaces on that row via `error`,
        // exactly as `loadVersions` already did for the expand-triggered path.
        const versionCalls = curricula.map(c =>
          this.api.listVersions(c.id).pipe(
            catchError((err: HttpErrorResponse) => of({ __error: toCurriculumUiError(err) } as const))
          )
        );
        forkJoin(versionCalls).subscribe(results => {
          this.rows.set(curricula.map((c, i) => {
            const result = results[i];
            const failed = typeof result === 'object' && result !== null && '__error' in result;
            return {
              curriculum: c,
              expanded: false,
              loading: false,
              error: failed ? (result as { __error: CurriculumUiError }).__error : null,
              versions: failed ? null : (result as CurriculumVersion[])
            };
          }));
          this.loading.set(false);
        });
      },
      error: (err: HttpErrorResponse) => {
        this.listError.set(toCurriculumUiError(err));
        this.loading.set(false);
      }
    });
  }

  toggleRow(row: RowState) {
    const rows = this.rows();
    const idx = rows.indexOf(row);
    if (idx === -1) return;
    rows[idx] = { ...row, expanded: !row.expanded };
    this.rows.set([...rows]);
  }

  loadVersions(row: RowState) {
    this.patchRow(row.curriculum.id, { loading: true, error: null });
    this.api.listVersions(row.curriculum.id).subscribe({
      next: versions => this.patchRow(row.curriculum.id, { loading: false, versions }),
      error: (err: HttpErrorResponse) => this.patchRow(row.curriculum.id, { loading: false, error: toCurriculumUiError(err) })
    });
  }

  private patchRow(curriculumId: number, patch: Partial<RowState>) {
    this.rows.update(rows => rows.map(r => r.curriculum.id === curriculumId ? { ...r, ...patch } : r));
  }

  danceStyleName(id: number): string {
    return this.danceStyles().get(id) ?? '—';
  }

  createNew() {
    this.router.navigate(['/vidya-rasa/curricula/new']);
  }

  openVersion(curriculumId: number, versionId: number) {
    this.router.navigate(['/vidya-rasa/curricula', curriculumId, 'versions', versionId]);
  }
}

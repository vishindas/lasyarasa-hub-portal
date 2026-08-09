import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Curriculum, CurriculumVersion } from '../../core/models/curriculum.model';
import { CurriculumApiService } from '../../core/services/curriculum-api.service';

/**
 * Shared two-step selector reused by the first-assignment flow (Class
 * Curriculum Management) and the Change Curriculum target picker, per the
 * approved data-composition rule: load curricula first, then load versions
 * only for the selected curriculum, filtered to ACTIVE -- never an eager
 * fan-out across every curriculum's versions.
 */
@Component({
  selector: 'app-curriculum-version-selector',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatSelectModule],
  styles: [`.row { display: flex; gap: 12px; flex-wrap: wrap; }`],
  template: `
    <div class="row">
      <mat-form-field appearance="outline">
        <mat-label>Curriculum</mat-label>
        <mat-select [(ngModel)]="selectedCurriculumId" (selectionChange)="onCurriculumChange($event.value)">
          @for (c of curricula(); track c.id) {
            <mat-option [value]="c.id">{{ c.internalName }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Active version</mat-label>
        <mat-select [(ngModel)]="selectedVersionId" [disabled]="!selectedCurriculumId" (selectionChange)="onVersionChange($event.value)">
          @for (v of activeVersions(); track v.id) {
            <mat-option [value]="v.id">v{{ v.versionNumber }} — {{ v.title }}</mat-option>
          }
          @if (selectedCurriculumId && !versionsLoading() && activeVersions().length === 0) {
            <mat-option [disabled]="true">No active version for this curriculum</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>
  `
})
export class CurriculumVersionSelectorComponent implements OnInit {
  private api = inject(CurriculumApiService);

  curricula = signal<Curriculum[]>([]);
  versions = signal<CurriculumVersion[]>([]);
  versionsLoading = signal(false);
  activeVersions = computed(() => this.versions().filter(v => v.status === 'ACTIVE'));

  selectedCurriculumId: number | null = null;
  selectedVersionId: number | null = null;

  versionSelected = output<CurriculumVersion | null>();

  ngOnInit() {
    this.api.list().subscribe({ next: c => this.curricula.set(c), error: () => this.curricula.set([]) });
  }

  onCurriculumChange(curriculumId: number) {
    this.selectedVersionId = null;
    this.versionSelected.emit(null);
    this.versions.set([]);
    this.versionsLoading.set(true);
    this.api.listVersions(curriculumId).subscribe({
      next: versions => { this.versions.set(versions); this.versionsLoading.set(false); },
      error: () => { this.versions.set([]); this.versionsLoading.set(false); }
    });
  }

  onVersionChange(versionId: number) {
    const v = this.versions().find(x => x.id === versionId) ?? null;
    this.versionSelected.emit(v);
  }
}

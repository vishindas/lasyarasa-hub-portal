import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AssignmentTemplateApiService } from '../../../core/services/assignment-template-api.service';
import { AssignmentTemplateSummaryDTO } from '../../../core/models/assignment.model';
import { AssignmentUiError, toAssignmentUiError } from '../../../core/services/assignment-api-error.util';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { AssignmentModeBannerComponent } from '../../../shared/assignment/assignment-mode-banner';
import { AssignmentMessageComponent } from '../../../shared/assignment/assignment-message';
import { FullOutageBlockComponent } from '../../../shared/curriculum/full-outage-block';
import { TemplateListRowComponent } from './template-list-row';

/** T1 -- paginated template list, optionally module-scoped via the ?moduleId= query param (Manage Assignments entry point). Reads/navigation remain available during WRITE_FROZEN; "New Template" is disabled. */
@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, AssignmentModeBannerComponent, AssignmentMessageComponent, FullOutageBlockComponent, TemplateListRowComponent],
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .empty { color: #adb5bd; padding: 32px 0; text-align: center; }
  `],
  template: `
    @if (mode.mode() === 'FULL_OUTAGE') {
      <app-full-outage-block />
    } @else {
      <app-assignment-mode-banner />
      <div class="page-header">
        <h2 style="margin:0">Assignment Templates</h2>
        @if (moduleId() != null && curriculumVersionId() != null) {
          <button mat-flat-button color="primary" type="button" [disabled]="mode.mutationsDisabled()" (click)="createTemplate()">
            <mat-icon>add</mat-icon> New Template
          </button>
        }
      </div>

      @if (loading()) {
        <p class="empty">Loading…</p>
      } @else if (error()) {
        <app-assignment-message [error]="error()" (reload)="load()" (retry)="load()" />
      } @else if (templates().length === 0) {
        <p class="empty">No assignment templates yet.</p>
      } @else {
        @for (t of templates(); track t.id) {
          <app-template-list-row [template]="t" (open)="openTemplate($event)" />
        }
      }
    }
  `
})
export class TemplateListComponent implements OnInit {
  private api = inject(AssignmentTemplateApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  mode = inject(ClassroomLiteModeService);

  moduleId = signal<number | null>(null);
  curriculumVersionId = signal<number | null>(null);
  templates = signal<AssignmentTemplateSummaryDTO[]>([]);
  loading = signal(true);
  error = signal<AssignmentUiError | null>(null);

  ngOnInit() {
    const rawModule = this.route.snapshot.queryParamMap.get('moduleId');
    const rawVersion = this.route.snapshot.queryParamMap.get('curriculumVersionId');
    this.moduleId.set(rawModule ? Number(rawModule) : null);
    this.curriculumVersionId.set(rawVersion ? Number(rawVersion) : null);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(this.moduleId(), 0, 50).subscribe({
      next: page => { this.templates.set(page.content); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(toAssignmentUiError(err)); this.loading.set(false); }
    });
  }

  openTemplate(templateId: number) {
    this.router.navigate(['/vidya-rasa/assignments/templates', templateId]);
  }

  createTemplate() {
    // Only buildable when arriving module-scoped (Manage Assignments entry point),
    // which supplies both moduleId and curriculumVersionId as query params -- the
    // unfiltered sidebar entry point has no module context to create against.
    const moduleId = this.moduleId();
    const curriculumVersionId = this.curriculumVersionId();
    if (moduleId == null || curriculumVersionId == null) return;
    this.api.create({ moduleId, curriculumVersionId }).subscribe({
      next: created => this.router.navigate(['/vidya-rasa/assignments/templates', created.id]),
      error: (err: HttpErrorResponse) => this.error.set(toAssignmentUiError(err))
    });
  }
}

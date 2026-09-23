import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { AssignmentTemplatePreviewDTO, AssignmentPreviewQuestionDTO, AssignmentQuestionType } from '../../../core/models/assignment.model';
import { AssignmentTemplateApiService } from '../../../core/services/assignment-template-api.service';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { ClassroomLiteBannerComponent } from '../../../shared/curriculum/classroom-lite-banner';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { FullOutageBlockComponent } from '../../../shared/curriculum/full-outage-block';

const QUESTION_TYPE_LABEL: Record<AssignmentQuestionType, string> = {
  SINGLE_CHOICE: 'Single choice', MULTIPLE_CHOICE: 'Multiple choice', SHORT_TEXT: 'Short text', LONG_TEXT: 'Long text'
};

/**
 * Issue #56 -- read-only, answer-key-free preview of a module's published
 * assignment template, reached only from lessons/preview's "Related
 * Assignments" section (LessonListComponent's own previewMode). A
 * brand-new component: deliberately does NOT import or embed
 * TemplatePreviewComponent (features/assignments/template-editor/**),
 * which is documented as staff-only and preserves isCorrect highlighting
 * -- exactly the opposite of what this "what a student would see" screen
 * must show. Sources content exclusively from
 * AssignmentTemplateApiService.preview(), which wraps the new,
 * dedicated, answer-key-free GET /templates/{id}/preview endpoint (Issue
 * #56 backend) -- never features/assignments/data-access/**, whose
 * AssignmentQuestionDTO/AssignmentQuestionOptionDTO graph carries
 * isCorrect.
 *
 * No authoring/publish/archive/assign/edit/grading control of any kind
 * renders here -- every input is a disabled, inert placeholder shaped like
 * what a student would actually answer, never a real form. No
 * assignment_instance is ever created by viewing this screen.
 */
@Component({
  selector: 'app-curriculum-assignment-preview',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatCardModule, ClassroomLiteBannerComponent, CurriculumMessageComponent, FullOutageBlockComponent],
  styles: [`
    button[mat-flat-button], button[mat-stroked-button], button[mat-button] { min-height: 44px; }
    :host { display: block; }
    .preview-banner {
      display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 8px;
      background: #eef0fb; color: #3d4ed8; font-size: 0.8rem; font-weight: 600; margin-bottom: 12px;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .panel { max-width: 760px; }
    .question { border: 1px solid #eee; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; }
    .type-label { color: #6c757d; font-size: 0.78rem; margin-bottom: 8px; }
    .prompt { font-weight: 600; margin-bottom: 10px; }
    .option { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
    .option .marker { width: 16px; text-align: center; color: #6c757d; }
    textarea, input.text-answer { width: 100%; max-width: 480px; }
  `],
  template: `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:6px">
        <button mat-icon-button (click)="close()" aria-label="Back to Related Assignments">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2 style="margin:0">Assignment Preview</h2>
      </div>
    </div>

    @if (mode.mode() === 'FULL_OUTAGE') {
      <app-full-outage-block />
    } @else {
      <app-classroom-lite-banner />

      @if (loading()) {
        <p style="color:#adb5bd;padding:32px 0">Loading…</p>
      } @else if (loadError()) {
        <app-curriculum-message [error]="loadError()" (retry)="load()" (reload)="load()" />
      } @else if (preview(); as p) {
        <div class="panel">
          <div class="preview-banner">
            <mat-icon aria-hidden="true">visibility</mat-icon> Preview mode — this is what a student would see if this assignment is assigned. Nothing here is released to students.
          </div>

          <h3 style="margin:0 0 12px">{{ p.title }}</h3>

          @for (q of p.questions; track q.id) {
            <div class="question">
              <div class="type-label">{{ typeLabel(q) }}</div>
              <div class="prompt">{{ q.questionOrder }}. {{ q.prompt }}</div>

              @if (q.questionType === 'SINGLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE') {
                @for (o of q.options; track o.id) {
                  <div class="option">
                    <span class="marker" aria-hidden="true">{{ q.questionType === 'SINGLE_CHOICE' ? '◯' : '☐' }}</span>
                    <span>{{ o.optionLabel }}</span>
                  </div>
                }
                @if (q.questionType === 'MULTIPLE_CHOICE' && q.maxSelections != null) {
                  <p class="type-label">Select up to {{ q.maxSelections }}.</p>
                }
              } @else if (q.questionType === 'SHORT_TEXT') {
                <input class="text-answer" type="text" disabled placeholder="Student's short-text answer" />
              } @else if (q.questionType === 'LONG_TEXT') {
                <textarea class="text-answer" rows="3" disabled placeholder="Student's long-text answer"></textarea>
              }
            </div>
          } @empty {
            <p style="color:#6c757d">This assignment has no questions yet.</p>
          }
        </div>
      }
    }
  `
})
export class CurriculumAssignmentPreviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private templateApi = inject(AssignmentTemplateApiService);
  mode = inject(ClassroomLiteModeService);

  curriculumId = signal<number | null>(null);
  versionId = signal<number | null>(null);
  moduleId = signal<number | null>(null);
  templateId = signal<number | null>(null);

  preview = signal<AssignmentTemplatePreviewDTO | null>(null);
  loading = signal(true);
  loadError = signal<CurriculumUiError | null>(null);

  ngOnInit() {
    this.curriculumId.set(Number(this.route.snapshot.paramMap.get('curriculumId')));
    this.versionId.set(Number(this.route.snapshot.paramMap.get('versionId')));
    this.moduleId.set(Number(this.route.snapshot.paramMap.get('moduleId')));
    this.templateId.set(Number(this.route.snapshot.paramMap.get('templateId')));
    this.load();
  }

  load() {
    const tId = this.templateId();
    if (tId === null) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.templateApi.preview(tId).subscribe({
      next: p => { this.preview.set(p); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.loadError.set(toCurriculumUiError(err)); this.loading.set(false); }
    });
  }

  typeLabel(q: AssignmentPreviewQuestionDTO): string {
    return QUESTION_TYPE_LABEL[q.questionType];
  }

  /** Issue #56: back always returns to the module's Related-Assignments-bearing Preview screen, never anywhere authoring-related. */
  close() {
    const cId = this.curriculumId(), vId = this.versionId(), mId = this.moduleId();
    this.router.navigate(['/vidya-rasa/curricula', cId, 'versions', vId, 'modules', mId, 'lessons', 'preview']);
  }
}

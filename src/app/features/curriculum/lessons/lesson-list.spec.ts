import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { CurriculumVersion, Lesson } from '../../../core/models/curriculum.model';
import { LessonListComponent } from './lesson-list';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

const DRAFT_VERSION: CurriculumVersion = {
  id: 10, curriculumId: 1, versionNumber: 1, status: 'DRAFT', title: 't', level: null, objectives: null,
  clonedFromVersionId: null, rowVersion: 0, activatedAt: null, activatedBy: null, archivedAt: null, archivedBy: null
};

function textLesson(id: number, title: string, lessonOrder: number, lifecycleStatus: Lesson['lifecycleStatus']): Lesson {
  return {
    id, moduleId: 101, title, contentType: 'TEXT', lessonOrder, lifecycleStatus,
    videoId: null, videoAvailability: null, textContent: 'body', externalUrl: null, externalLinkLabel: null,
    practiceNotes: null, rowVersion: 0, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null,
    attestedAt: null, attestedBy: null
  };
}

const LESSON_1 = textLesson(1, 'First', 1, 'DRAFT');
const LESSON_2_ARCHIVED = textLesson(2, 'Second (archived)', 2, 'ARCHIVED');
const LESSON_3 = textLesson(3, 'Third', 3, 'DRAFT');

/**
 * CURR-FUNC-05: an archived lesson row must not expose a drag handle or
 * move buttons of its own, and a non-archived neighbor's own move button
 * must refuse to swap across it -- but ordinary reordering of lessons that
 * don't involve an archived neighbor must be completely unaffected.
 */
describe('LessonListComponent -- CURR-FUNC-05 archived rows are not reorderable', () => {
  let httpMock: HttpTestingController;

  function setup(lessons: Lesson[]) {
    TestBed.configureTestingModule({
      imports: [LessonListComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ curriculumId: '1', versionId: '10', moduleId: '101' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(LessonListComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions/10`).flush(DRAFT_VERSION);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/101/lessons`).flush(lessons);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  function rowContaining(el: HTMLElement, text: string): HTMLElement {
    const row = Array.from(el.querySelectorAll('.row')).find(r => (r.textContent ?? '').includes(text));
    if (!row) throw new Error(`No row found containing "${text}"`);
    return row as HTMLElement;
  }

  it('an archived row shows no drag handle and no move-up/move-down buttons', () => {
    const fixture = setup([LESSON_1, LESSON_2_ARCHIVED, LESSON_3]);
    const el = fixture.nativeElement as HTMLElement;
    const archivedRow = rowContaining(el, 'Second (archived)');

    expect(archivedRow.querySelector('.drag-handle')).toBeNull();
    expect(archivedRow.querySelector('.order-buttons')).toBeNull();
  });

  it('a non-archived row still shows its drag handle and move buttons', () => {
    const fixture = setup([LESSON_1, LESSON_2_ARCHIVED, LESSON_3]);
    const el = fixture.nativeElement as HTMLElement;
    const firstRow = rowContaining(el, 'First');

    expect(firstRow.querySelector('.drag-handle')).not.toBeNull();
    expect(firstRow.querySelector('.order-buttons')).not.toBeNull();
  });

  it('Preview remains available on an archived row, exactly like any other row', () => {
    const fixture = setup([LESSON_1, LESSON_2_ARCHIVED, LESSON_3]);
    const el = fixture.nativeElement as HTMLElement;
    const archivedRow = rowContaining(el, 'Second (archived)');
    const previewButton = Array.from(archivedRow.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Preview');

    expect(previewButton).toBeDefined();
    expect(previewButton?.disabled).toBeFalsy();
  });

  it('moveDown on the lesson directly above an archived lesson is refused -- no request sent', () => {
    const fixture = setup([LESSON_1, LESSON_2_ARCHIVED, LESSON_3]);
    fixture.componentInstance.moveDown(0); // First (index 0) would swap with the archived lesson at index 1

    httpMock.expectNone(`${environment.apiUrl}/school/curricula/versions/modules/101/lessons/reorder`);
  });

  it('moveUp on the lesson directly below an archived lesson is refused -- no request sent', () => {
    const fixture = setup([LESSON_1, LESSON_2_ARCHIVED, LESSON_3]);
    fixture.componentInstance.moveUp(2); // Third (index 2) would swap with the archived lesson at index 1

    httpMock.expectNone(`${environment.apiUrl}/school/curricula/versions/modules/101/lessons/reorder`);
  });

  it('ordinary reordering of two non-archived lessons that never involves the archived one is completely unaffected', () => {
    const lessonA = textLesson(11, 'A', 1, 'DRAFT');
    const lessonB = textLesson(12, 'B', 2, 'DRAFT');
    const archived = textLesson(13, 'Archived tail', 3, 'ARCHIVED');
    const fixture = setup([lessonA, lessonB, archived]);

    fixture.componentInstance.moveDown(0); // swap A and B -- the archived lesson (index 2) is never touched

    const req = httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/101/lessons/reorder`);
    // applyReorder() iterates the post-swap array in index order, so B (now at index 0) is emitted before A.
    expect(req.request.body.entries).toEqual([
      { lessonId: 12, expectedRowVersion: 0, newOrder: 1 },
      { lessonId: 11, expectedRowVersion: 0, newOrder: 2 }
    ]);
    req.flush([{ ...lessonA, lessonOrder: 2 }, { ...lessonB, lessonOrder: 1 }, archived]);
  });
});

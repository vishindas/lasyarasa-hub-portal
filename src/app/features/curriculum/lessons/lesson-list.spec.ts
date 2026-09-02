import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { environment } from '../../../../environments/environment';
import { CurriculumVersion, CurriculumModule, Lesson } from '../../../core/models/curriculum.model';
import { LessonListComponent } from './lesson-list';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

const DRAFT_VERSION: CurriculumVersion = {
  id: 10, curriculumId: 1, versionNumber: 1, status: 'DRAFT', title: 't', level: null, objectives: null,
  clonedFromVersionId: null, rowVersion: 0, activatedAt: null, activatedBy: null, archivedAt: null, archivedBy: null
};

const DRAFT_MODULE: CurriculumModule = {
  id: 101, curriculumVersionId: 10, title: 'Module', objectives: null, moduleOrder: 1, contentStatus: 'DRAFT',
  rowVersion: 0, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null
};

const ARCHIVED_MODULE: CurriculumModule = {
  ...DRAFT_MODULE, contentStatus: 'ARCHIVED', rowVersion: 2, publishedAt: 'x', publishedBy: 1, archivedAt: 'x', archivedBy: 1
};

function textLesson(id: number, title: string, lessonOrder: number, lifecycleStatus: Lesson['lifecycleStatus']): Lesson {
  return {
    id, moduleId: 101, title, contentType: 'TEXT', lessonOrder, lifecycleStatus,
    videoId: null, videoAvailability: null, textContent: 'body', externalUrl: null, externalLinkLabel: null,
    practiceNotes: null, rowVersion: 0, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null,
    attestedAt: null, attestedBy: null
  };
}

/** Matches the architect's own example exactly: A(1) / X-archived(2) / B(3) / C(4). */
const LESSON_A = textLesson(1, 'Active A', 1, 'DRAFT');
const LESSON_X_ARCHIVED = textLesson(2, 'Archived X', 2, 'ARCHIVED');
const LESSON_B = textLesson(3, 'Active B', 3, 'DRAFT');
const LESSON_C = textLesson(4, 'Active C', 4, 'DRAFT');

function dropEvent(previousIndex: number, currentIndex: number): CdkDragDrop<Lesson[]> {
  return { previousIndex, currentIndex } as CdkDragDrop<Lesson[]>;
}

/**
 * CURR-FUNC-05 review correction: ARCHIVED lessons are fixed positional
 * anchors -- their own lessonOrder never changes and they are never named in
 * a reorder request, but active lessons must still be freely reorderable
 * around them (including crossing past an archived lesson entirely), and a
 * module with no archived lessons at all must behave exactly as before.
 */
describe('LessonListComponent -- CURR-FUNC-05 archived lessons are fixed reorder anchors', () => {
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
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/10/modules`).flush([DRAFT_MODULE]);
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

  function reorderReq() {
    return httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/101/lessons/reorder`);
  }

  // ---- Requirements 1-2: archived row itself is not interactive ----

  it('an archived row shows no drag handle and no move-up/move-down buttons', () => {
    const fixture = setup([LESSON_A, LESSON_X_ARCHIVED, LESSON_B, LESSON_C]);
    const el = fixture.nativeElement as HTMLElement;
    const archivedRow = rowContaining(el, 'Archived X');

    expect(archivedRow.querySelector('.drag-handle')).toBeNull();
    expect(archivedRow.querySelector('.order-buttons')).toBeNull();
  });

  it('a non-archived row still shows its drag handle and move buttons', () => {
    const fixture = setup([LESSON_A, LESSON_X_ARCHIVED, LESSON_B, LESSON_C]);
    const el = fixture.nativeElement as HTMLElement;
    const activeRow = rowContaining(el, 'Active A');

    expect(activeRow.querySelector('.drag-handle')).not.toBeNull();
    expect(activeRow.querySelector('.order-buttons')).not.toBeNull();
  });

  // ---- Requirements 3-5: active lessons cross a fixed archived anchor ----

  /** The architect's own worked example: dragging C (last, below X) to the very top. */
  it('an active lesson can move from below an archived row to above it, and the archived row keeps its exact position', () => {
    const fixture = setup([LESSON_A, LESSON_X_ARCHIVED, LESSON_B, LESSON_C]);
    fixture.componentInstance.onDrop(dropEvent(3, 0)); // drag C (index 3) to the top (index 0)

    const req = reorderReq();
    expect(req.request.body.entries).toEqual(
      expect.arrayContaining([
        { lessonId: LESSON_C.id, expectedRowVersion: 0, newOrder: 1 },
        { lessonId: LESSON_A.id, expectedRowVersion: 0, newOrder: 3 },
        { lessonId: LESSON_B.id, expectedRowVersion: 0, newOrder: 4 }
      ])
    );
    expect(req.request.body.entries).toHaveLength(3); // X (archived) is never included
    req.flush([
      { ...LESSON_C, lessonOrder: 1 }, LESSON_X_ARCHIVED, { ...LESSON_A, lessonOrder: 3 }, { ...LESSON_B, lessonOrder: 4 }
    ]);
  });

  it('an active lesson can move from above an archived row to below it, and the archived row keeps its exact position', () => {
    const fixture = setup([LESSON_A, LESSON_X_ARCHIVED, LESSON_B, LESSON_C]);
    fixture.componentInstance.onDrop(dropEvent(0, 3)); // drag A (index 0) to the bottom (index 3)

    const req = reorderReq();
    expect(req.request.body.entries).toEqual(
      expect.arrayContaining([
        { lessonId: LESSON_B.id, expectedRowVersion: 0, newOrder: 1 },
        { lessonId: LESSON_C.id, expectedRowVersion: 0, newOrder: 3 },
        { lessonId: LESSON_A.id, expectedRowVersion: 0, newOrder: 4 }
      ])
    );
    expect(req.request.body.entries).toHaveLength(3);
    req.flush([
      { ...LESSON_B, lessonOrder: 1 }, LESSON_X_ARCHIVED, { ...LESSON_C, lessonOrder: 3 }, { ...LESSON_A, lessonOrder: 4 }
    ]);
  });

  // ---- Requirement 6: multiple fixed anchors ----

  it('multiple archived lessons all remain fixed anchors at once', () => {
    const x1 = textLesson(21, 'Archived X1', 2, 'ARCHIVED');
    const x2 = textLesson(22, 'Archived X2', 4, 'ARCHIVED');
    const a = textLesson(23, 'A', 1, 'DRAFT');
    const b = textLesson(24, 'B', 3, 'DRAFT');
    const c = textLesson(25, 'C', 5, 'DRAFT');
    const fixture = setup([a, x1, b, x2, c]);

    fixture.componentInstance.onDrop(dropEvent(4, 0)); // drag C (index 4) to the top

    const req = reorderReq();
    // Available (non-archived) positions are exactly {1,3,5} -- both X1 (2) and X2 (4) are absent from every entry.
    expect(req.request.body.entries.some((e: { lessonId: number }) => e.lessonId === x1.id)).toBe(false);
    expect(req.request.body.entries.some((e: { lessonId: number }) => e.lessonId === x2.id)).toBe(false);
    expect(req.request.body.entries).toEqual(
      expect.arrayContaining([
        { lessonId: c.id, expectedRowVersion: 0, newOrder: 1 },
        { lessonId: a.id, expectedRowVersion: 0, newOrder: 3 },
        { lessonId: b.id, expectedRowVersion: 0, newOrder: 5 }
      ])
    );
    req.flush([{ ...c, lessonOrder: 1 }, x1, { ...a, lessonOrder: 3 }, x2, { ...b, lessonOrder: 5 }]);
  });

  // ---- Requirement 7: adjacent active swaps around a fixed anchor ----

  it('an adjacent swap of two active lessons still works with an archived lesson elsewhere in the module', () => {
    const fixture = setup([LESSON_A, LESSON_X_ARCHIVED, LESSON_B, LESSON_C]);
    fixture.componentInstance.moveDown(2); // B (full-array index 2) swaps down with C

    const req = reorderReq();
    expect(req.request.body.entries).toEqual(
      expect.arrayContaining([
        { lessonId: LESSON_C.id, expectedRowVersion: 0, newOrder: 3 },
        { lessonId: LESSON_B.id, expectedRowVersion: 0, newOrder: 4 }
      ])
    );
    expect(req.request.body.entries).toHaveLength(2);
    req.flush([LESSON_A, LESSON_X_ARCHIVED, { ...LESSON_C, lessonOrder: 3 }, { ...LESSON_B, lessonOrder: 4 }]);
  });

  // ---- Requirement 8: no archived lessons at all -- unchanged from before ----

  it('a module with no archived lessons behaves exactly as before', () => {
    const a = textLesson(31, 'A', 1, 'DRAFT');
    const b = textLesson(32, 'B', 2, 'DRAFT');
    const fixture = setup([a, b]);

    fixture.componentInstance.moveDown(0);

    const req = reorderReq();
    expect(req.request.body.entries).toEqual([
      { lessonId: b.id, expectedRowVersion: 0, newOrder: 1 },
      { lessonId: a.id, expectedRowVersion: 0, newOrder: 2 }
    ]);
    req.flush([{ ...b, lessonOrder: 1 }, { ...a, lessonOrder: 2 }]);
  });

  // ---- Requirement 9: Preview unaffected ----

  it('Preview remains available on an archived row, exactly like any other row', () => {
    const fixture = setup([LESSON_A, LESSON_X_ARCHIVED, LESSON_B, LESSON_C]);
    const el = fixture.nativeElement as HTMLElement;
    const archivedRow = rowContaining(el, 'Archived X');
    const previewButton = Array.from(archivedRow.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Preview');

    expect(previewButton).toBeDefined();
    expect(previewButton?.disabled).toBeFalsy();
  });

  // ---- Requirement 10: impossible/no-op moves emit nothing ----

  it('moveUp on the first active lesson is a no-op -- no request sent', () => {
    const fixture = setup([LESSON_A, LESSON_X_ARCHIVED, LESSON_B, LESSON_C]);
    fixture.componentInstance.moveUp(0); // A is already first among active lessons

    httpMock.expectNone(`${environment.apiUrl}/school/curricula/versions/modules/101/lessons/reorder`);
  });

  it('moveDown on the last active lesson is a no-op -- no request sent', () => {
    const fixture = setup([LESSON_A, LESSON_X_ARCHIVED, LESSON_B, LESSON_C]);
    fixture.componentInstance.moveDown(3); // C is already last among active lessons

    httpMock.expectNone(`${environment.apiUrl}/school/curricula/versions/modules/101/lessons/reorder`);
  });

  it('dropping a lesson back at its own position is a no-op -- no request sent', () => {
    const fixture = setup([LESSON_A, LESSON_X_ARCHIVED, LESSON_B, LESSON_C]);
    fixture.componentInstance.onDrop(dropEvent(0, 0));

    httpMock.expectNone(`${environment.apiUrl}/school/curricula/versions/modules/101/lessons/reorder`);
  });
});

/** CURR-FUNC-06: ARCHIVED MODULE = FROZEN SUBTREE -- Add Lesson and reorder must be disabled at the list level too, not only inside the editor. */
describe('LessonListComponent -- CURR-FUNC-06 archived-module lessons are read-only', () => {
  let httpMock: HttpTestingController;

  function setupWithModule(modulesResponse: CurriculumModule[] | 'error', lessons: Lesson[] = [LESSON_A, LESSON_B]) {
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
    if (modulesResponse === 'error') {
      httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/10/modules`)
        .flush({ code: 'SERVER_ERROR' }, { status: 500, statusText: 'Server Error' });
    } else {
      httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/10/modules`).flush(modulesResponse);
    }
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/101/lessons`).flush(lessons);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('Add Lesson is hidden when the module is ARCHIVED', () => {
    const fixture = setupWithModule([ARCHIVED_MODULE]);
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button')).map(b => b.textContent?.trim() ?? '');
    expect(buttons.some(t => t.includes('Add Lesson'))).toBe(false);
  });

  it('Add Lesson is shown when the module is DRAFT (unaffected)', () => {
    const fixture = setupWithModule([DRAFT_MODULE]);
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button')).map(b => b.textContent?.trim() ?? '');
    expect(buttons.some(t => t.includes('Add Lesson'))).toBe(true);
  });

  it('reorder is disabled -- moveDown on an ARCHIVED module sends no request', () => {
    const fixture = setupWithModule([ARCHIVED_MODULE]);
    expect(fixture.componentInstance.canReorder()).toBe(false);

    fixture.componentInstance.moveDown(0);

    httpMock.expectNone(`${environment.apiUrl}/school/curricula/versions/modules/101/lessons/reorder`);
  });

  it('shows the archived-module read-only banner', () => {
    const fixture = setupWithModule([ARCHIVED_MODULE]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This module is archived — its lessons are read-only.');
  });

  /** CURR-FUNC-06 (frontend test req): a module-state lookup failure must not fail open to editable. */
  it('module lookup failure fails closed -- Add Lesson stays hidden, reorder stays disabled', () => {
    const fixture = setupWithModule('error');
    const c = fixture.componentInstance;

    expect(c.module()).toBeNull();
    expect(c.canAddLesson()).toBe(false);
    expect(c.canReorder()).toBe(false);
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button')).map(b => b.textContent?.trim() ?? '');
    expect(buttons.some(t => t.includes('Add Lesson'))).toBe(false);
  });

  /** A module not found in the list (e.g. deleted/foreign) resolves to `null`, same fail-closed treatment as an outright request error. */
  it('module not found in the list fails closed -- same as a lookup error', () => {
    const fixture = setupWithModule([]);
    const c = fixture.componentInstance;

    expect(c.module()).toBeNull();
    expect(c.canAddLesson()).toBe(false);
    expect(c.canReorder()).toBe(false);
  });
});

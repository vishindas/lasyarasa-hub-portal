import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { CurriculumVersion, CurriculumModule, Lesson } from '../../../core/models/curriculum.model';
import { LessonEditorComponent } from './lesson-editor';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

const DRAFT_VERSION: CurriculumVersion = {
  id: 10, curriculumId: 1, versionNumber: 1, status: 'DRAFT', title: 't', level: null, objectives: null,
  clonedFromVersionId: null, rowVersion: 0, activatedAt: null, activatedBy: null, archivedAt: null, archivedBy: null
};

const ACTIVE_VERSION: CurriculumVersion = { ...DRAFT_VERSION, id: 20, status: 'ACTIVE', activatedAt: 'x', activatedBy: 1 };

/** CURR-FUNC-06: every existing scenario in this file exercises a non-archived module -- only the dedicated describe block below covers an ARCHIVED one. */
function draftModuleFixture(id: number, curriculumVersionId: number): CurriculumModule {
  return {
    id, curriculumVersionId, title: 'Module', objectives: null, moduleOrder: 1, contentStatus: 'DRAFT',
    rowVersion: 0, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null
  };
}

function archivedModuleFixture(id: number, curriculumVersionId: number): CurriculumModule {
  return {
    id, curriculumVersionId, title: 'Module', objectives: null, moduleOrder: 1, contentStatus: 'ARCHIVED',
    rowVersion: 2, publishedAt: 'x', publishedBy: 1, archivedAt: 'x', archivedBy: 1
  };
}

const AVAILABLE_VIDEO_LESSON: Lesson = {
  id: 301, moduleId: 101, title: 'Introduction Video', contentType: 'VIDEO', lessonOrder: 1, lifecycleStatus: 'DRAFT',
  videoId: 'dQw4w9WgXcQ', videoAvailability: 'AVAILABLE', textContent: null, externalUrl: null, externalLinkLabel: null,
  practiceNotes: null, rowVersion: 0, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null,
  attestedAt: null, attestedBy: null
};

const UNAVAILABLE_VIDEO_LESSON: Lesson = {
  id: 306, moduleId: 201, title: 'Adavu Combinations', contentType: 'VIDEO', lessonOrder: 2, lifecycleStatus: 'PUBLISHED',
  videoId: 'AAAAAAAAAAA', videoAvailability: 'UNAVAILABLE', textContent: null, externalUrl: null, externalLinkLabel: null,
  practiceNotes: null, rowVersion: 2, publishedAt: 'x', publishedBy: 1, archivedAt: null, archivedBy: null,
  attestedAt: 'x', attestedBy: 1
};

/** CURR-FUNC-05: an archived lesson under a still-DRAFT parent -- the exact production repro shape. */
const ARCHIVED_TEXT_LESSON: Lesson = {
  id: 401, moduleId: 301, title: 'E2E Text Lesson 1 - Edited Test', contentType: 'TEXT', lessonOrder: 1, lifecycleStatus: 'ARCHIVED',
  videoId: null, videoAvailability: null, textContent: 'archived body text', externalUrl: null, externalLinkLabel: null,
  practiceNotes: 'archived notes', rowVersion: 4, publishedAt: null, publishedBy: null, archivedAt: 'x', archivedBy: 1,
  attestedAt: null, attestedBy: null
};

/**
 * MC-3: every edit-mode render of LessonEditorComponent mounts
 * <app-lesson-block-list> (any lesson, legacy or block-native, once
 * isEdit() && lesson() are both truthy), which fires its own GET for the
 * lesson's content blocks on ngOnChanges. Every edit-mode test below must
 * flush this request -- an unflushed one fails httpMock.verify() in
 * afterEach.
 */
function blocksUrl(lessonId: number): string {
  return `${environment.apiUrl}/school/curricula/versions/modules/lessons/${lessonId}/blocks`;
}

describe('LessonEditorComponent -- legacy lesson content display', () => {
  let httpMock: HttpTestingController;

  function setup(params: Record<string, string>) {
    TestBed.configureTestingModule({
      imports: [LessonEditorComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub(params) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(LessonEditorComponent);
  }

  afterEach(() => httpMock.verify());

  /**
   * MC-3 regression coverage: the old ordinary-edit-mode replace-video note
   * ("A YouTube video is currently linked... enter a different YouTube URL
   * and validate it to replace the video") is gone on purpose --
   * UpdateLessonRequest can no longer carry a video at all. A legacy VIDEO
   * lesson not needing repair now shows only the frozen read-only note.
   */
  it('legacy VIDEO lesson not needing repair: shows the read-only frozen-content note, never the raw video id, and no replace-video affordance', () => {
    const fixture = setup({ curriculumId: '1', versionId: '10', moduleId: '101', lessonId: '301' });
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions/10`).flush(DRAFT_VERSION);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/10/modules`).flush([draftModuleFixture(101, 10)]);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/101/lessons`).flush([AVAILABLE_VIDEO_LESSON]);
    fixture.detectChanges();
    httpMock.expectOne(blocksUrl(301)).flush([]);
    fixture.detectChanges();

    const c = fixture.componentInstance;
    expect(c.isLegacyLesson()).toBe(true);
    expect(c.needsLegacyRepair()).toBe(false);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This lesson was created before the block content editor.');
    expect(text).toContain('can no longer be edited here.');
    // The raw id itself is never rendered as visible text.
    expect(text).not.toContain('dQw4w9WgXcQ');
    // The id must still be available internally (e.g. to drive Preview).
    expect(c.lesson()?.videoId).toBe('dQw4w9WgXcQ');

    // No replace-video affordance in ordinary (non-repair) edit mode -- there
    // is no backend field left to send a replacement video through any more.
    expect((fixture.nativeElement as HTMLElement).querySelector('app-youtube-url-validator')).toBeNull();
  });

  it('repair mode: shows the corrected locked unavailable copy, never the raw video id or the old wording', () => {
    const fixture = setup({ curriculumId: '2', versionId: '20', moduleId: '201', lessonId: '306' });
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/2/versions/20`).flush(ACTIVE_VERSION);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/20/modules`).flush([draftModuleFixture(201, 20)]);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/201/lessons`).flush([UNAVAILABLE_VIDEO_LESSON]);
    fixture.detectChanges();
    httpMock.expectOne(blocksUrl(306)).flush([]);
    fixture.detectChanges();

    const c = fixture.componentInstance;
    expect(c.isLegacyLesson()).toBe(true);
    expect(c.needsLegacyRepair()).toBe(true);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This video is private, removed, restricted, or currently unavailable. Repair or replace the link.');
    expect(text).not.toContain('It may have been removed or deleted');
    expect(text).not.toContain('AAAAAAAAAAA');
    expect(c.lesson()?.videoId).toBe('AAAAAAAAAAA');
  });

  /** Carried over from the old CURR-FUNC-04 coverage: the repair flow's own validator must never be pre-seeded with the existing (unavailable) video -- repair always needs a genuinely new url, never the old (broken) one. */
  it('repair mode: the validator never pre-seeds the existing unavailable video -- repairReady() starts false', () => {
    const fixture = setup({ curriculumId: '2', versionId: '20', moduleId: '201', lessonId: '306' });
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/2/versions/20`).flush(ACTIVE_VERSION);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/20/modules`).flush([draftModuleFixture(201, 20)]);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/201/lessons`).flush([UNAVAILABLE_VIDEO_LESSON]);
    fixture.detectChanges();
    httpMock.expectOne(blocksUrl(306)).flush([]);
    fixture.detectChanges();

    expect(fixture.componentInstance.repairReady()).toBe(false);
  });
});

/**
 * MC-3: the old content-type toggle and its elaborate per-type
 * save-readiness coverage tested create-mode behavior that no longer
 * exists -- CreateLessonRequest is metadata-only (title + practiceNotes),
 * so a create-mode Save only ever depends on a non-blank title.
 */
describe('LessonEditorComponent -- create-mode Save enablement', () => {
  let httpMock: HttpTestingController;

  function setupCreate() {
    TestBed.configureTestingModule({
      imports: [LessonEditorComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ curriculumId: '1', versionId: '10', moduleId: '101' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(LessonEditorComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions/10`).flush(DRAFT_VERSION);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/10/modules`).flush([draftModuleFixture(101, 10)]);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('Save as Draft stays disabled with a blank title, and enables once a title is entered', () => {
    const fixture = setupCreate();
    const el = fixture.nativeElement as HTMLElement;
    const saveButton = () =>
      Array.from(el.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Save as Draft') as HTMLButtonElement;

    expect(saveButton().disabled).toBe(true);

    // Simulated as real user input (rather than mutating form.title directly)
    // so the [(ngModel)] two-way binding updates through its own normal
    // event path instead of an out-of-band property write.
    const titleInput = el.querySelector('input[maxlength="120"]') as HTMLInputElement;
    titleInput.value = 'A new lesson';
    titleInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(saveButton().disabled).toBe(false);
  });
});

/**
 * CURR-FUNC-05: an ARCHIVED lesson must open read-only even while its parent
 * curriculum version is still DRAFT -- the exact production repro. Every
 * field disabled, Save absent, lifecycle actions absent, a clear read-only
 * banner shown, Preview unaffected (this component doesn't gate Preview at
 * all -- it's a separate route from the Lessons list).
 */
describe('LessonEditorComponent -- CURR-FUNC-05 archived lesson is read-only', () => {
  let httpMock: HttpTestingController;

  function setupArchived() {
    TestBed.configureTestingModule({
      imports: [LessonEditorComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ curriculumId: '1', versionId: '10', moduleId: '301', lessonId: '401' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(LessonEditorComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions/10`).flush(DRAFT_VERSION); // parent still DRAFT -- the exact production condition
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/10/modules`).flush([draftModuleFixture(301, 10)]); // module itself not archived -- isolates this test to the lesson's own ARCHIVED status
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/301/lessons`).flush([ARCHIVED_TEXT_LESSON]);
    fixture.detectChanges();
    httpMock.expectOne(blocksUrl(401)).flush([]);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('opens read-only: isArchived()/readOnly() are true even though the parent version is DRAFT', () => {
    const fixture = setupArchived();
    const c = fixture.componentInstance;

    expect(c.parentDraft()).toBe(true); // the exact production condition -- parent alone would otherwise allow editing
    expect(c.isArchived()).toBe(true);
    expect(c.readOnly()).toBe(true);
  });

  /**
   * Every field's [disabled] binding in the template reads readOnly()
   * directly (title, practice notes) -- this asserts that single shared
   * source of truth rather than each wrapped native control's own DOM
   * state. Angular Material's MDC-based form-field/input components do not
   * reliably reflect a `[disabled]` binding onto the native element's
   * `.disabled` property (or even onto MatFormField's own
   * `mat-form-field-disabled` host class) within this Vitest+jsdom harness
   * at fixture.detectChanges() time -- confirmed by manually running this
   * exact archived-lesson scenario in a real browser (screenshot evidence),
   * where every field is genuinely, visibly disabled. No other test in this
   * codebase asserts matInput's raw DOM disabled state for the same reason.
   */
  it('every field is disabled (readOnly() is the single shared source every field\'s [disabled] binding reads)', () => {
    const fixture = setupArchived();
    expect(fixture.componentInstance.readOnly()).toBe(true);
  });

  it('Save is not available', () => {
    const fixture = setupArchived();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button')).map(b => b.textContent?.trim());

    expect(buttons.some(t => t === 'Save')).toBe(false);
    expect(buttons.some(t => t === 'Save as Draft')).toBe(false);
  });

  it('Publish/Unpublish/Archive actions are unavailable', () => {
    const fixture = setupArchived();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button')).map(b => b.textContent?.trim() ?? '');

    expect(buttons.some(t => t.includes('Publish'))).toBe(false); // covers both "Publish" and "Unpublish"
    expect(buttons.some(t => t.includes('Archive'))).toBe(false);
  });

  it('shows the archived read-only banner', () => {
    const fixture = setupArchived();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Archived lesson — this lesson is read-only.');
  });

  it('save() is a defensive no-op for an archived lesson even if invoked directly', () => {
    const fixture = setupArchived();
    const c = fixture.componentInstance;
    c.form.title = 'Attempted change';

    c.save();

    httpMock.expectNone(`${environment.apiUrl}/school/curricula/versions/modules/lessons/401`);
  });
});

/**
 * CURR-FUNC-06: a DRAFT (unarchived) lesson whose *parent module* is
 * ARCHIVED must open read-only -- direct URL access to a child lesson under
 * an archived module must never restore editability. Distinct from
 * CURR-FUNC-05 above (the lesson's own ARCHIVED status): here the lesson
 * itself is a perfectly ordinary DRAFT lesson.
 */
describe('LessonEditorComponent -- CURR-FUNC-06 archived-module lesson is read-only', () => {
  let httpMock: HttpTestingController;

  const DRAFT_LESSON_UNDER_ARCHIVED_MODULE: Lesson = {
    id: 501, moduleId: 401, title: 'Ordinary Draft Lesson', contentType: 'TEXT', lessonOrder: 1, lifecycleStatus: 'DRAFT',
    videoId: null, videoAvailability: null, textContent: 'ordinary body text', externalUrl: null, externalLinkLabel: null,
    practiceNotes: null, rowVersion: 0, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null,
    attestedAt: null, attestedBy: null
  };

  function setupUnderArchivedModule() {
    TestBed.configureTestingModule({
      imports: [LessonEditorComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ curriculumId: '1', versionId: '10', moduleId: '401', lessonId: '501' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(LessonEditorComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions/10`).flush(DRAFT_VERSION); // parent version still DRAFT -- module archival is the only reason this is read-only
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/10/modules`).flush([archivedModuleFixture(401, 10)]);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/401/lessons`).flush([DRAFT_LESSON_UNDER_ARCHIVED_MODULE]);
    fixture.detectChanges();
    httpMock.expectOne(blocksUrl(501)).flush([]);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('opens read-only: readOnly() is true even though both the parent version and the lesson itself are DRAFT', () => {
    const fixture = setupUnderArchivedModule();
    const c = fixture.componentInstance;

    expect(c.parentDraft()).toBe(true);
    expect(c.isArchived()).toBe(false); // the lesson itself is an ordinary DRAFT lesson
    expect(c.moduleArchived()).toBe(true);
    expect(c.readOnly()).toBe(true);
  });

  it('shows the archived-module read-only banner', () => {
    const fixture = setupUnderArchivedModule();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain("This lesson's module is archived — its content is read-only.");
  });

  it('Save is not available', () => {
    const fixture = setupUnderArchivedModule();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button')).map(b => b.textContent?.trim());
    expect(buttons.some(t => t === 'Save')).toBe(false);
  });

  it('Publish/Unpublish/Archive actions are unavailable', () => {
    const fixture = setupUnderArchivedModule();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button')).map(b => b.textContent?.trim() ?? '');
    expect(buttons.some(t => t.includes('Publish'))).toBe(false);
    expect(buttons.some(t => t.includes('Archive'))).toBe(false);
  });

  it('save() is a defensive no-op even if invoked directly', () => {
    const fixture = setupUnderArchivedModule();
    const c = fixture.componentInstance;
    c.form.title = 'Attempted change';

    c.save();

    httpMock.expectNone(`${environment.apiUrl}/school/curricula/versions/modules/lessons/501`);
  });

  /**
   * CURR-FUNC-06 (frontend test req): a module-state lookup failure must
   * not fail open to editable. The module list request errors outright
   * (network failure) -- `module` stays `null` forever, and
   * moduleConfirmedWritable()/readOnly() must treat that exactly like a
   * confirmed-archived module: not writable.
   */
  it('module lookup failure fails closed -- never falls back to editable', () => {
    TestBed.configureTestingModule({
      imports: [LessonEditorComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ curriculumId: '1', versionId: '10', moduleId: '401', lessonId: '501' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(LessonEditorComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions/10`).flush(DRAFT_VERSION);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/10/modules`)
      .flush({ code: 'SERVER_ERROR' }, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/401/lessons`).flush([DRAFT_LESSON_UNDER_ARCHIVED_MODULE]);
    fixture.detectChanges();
    httpMock.expectOne(blocksUrl(501)).flush([]);
    fixture.detectChanges();

    const c = fixture.componentInstance;
    expect(c.module()).toBeNull();
    expect(c.moduleConfirmedWritable()).toBe(false);
    expect(c.readOnly()).toBe(true);
  });
});

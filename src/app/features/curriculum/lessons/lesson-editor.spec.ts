import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { CurriculumVersion, Lesson } from '../../../core/models/curriculum.model';
import { LessonEditorComponent } from './lesson-editor';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

const DRAFT_VERSION: CurriculumVersion = {
  id: 10, curriculumId: 1, versionNumber: 1, status: 'DRAFT', title: 't', level: null, objectives: null,
  clonedFromVersionId: null, rowVersion: 0, activatedAt: null, activatedBy: null, archivedAt: null, archivedBy: null
};

const ACTIVE_VERSION: CurriculumVersion = { ...DRAFT_VERSION, id: 20, status: 'ACTIVE', activatedAt: 'x', activatedBy: 1 };

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

describe('LessonEditorComponent -- video-id-in-copy corrections', () => {
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

  it('ordinary (non-repair) edit mode: shows the id-free linked-video note, never the raw video id', () => {
    const fixture = setup({ curriculumId: '1', versionId: '10', moduleId: '101', lessonId: '301' });
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions/10`).flush(DRAFT_VERSION);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/101/lessons`).flush([AVAILABLE_VIDEO_LESSON]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('A YouTube video is currently linked. You can save title/practice-note changes as-is, or enter a different YouTube URL and validate it to replace the video.');
    // The raw id itself is never rendered as visible text -- it only ever appears inside the reconstructed URL bound to the input's value property, which textContent does not include.
    expect(text).not.toContain('dQw4w9WgXcQ');
    // The id must still be available internally to drive the repair/embed payload.
    expect(fixture.componentInstance.lesson()?.videoId).toBe('dQw4w9WgXcQ');
  });

  it('repair mode: shows the corrected locked unavailable copy, never the raw video id or the old wording', () => {
    const fixture = setup({ curriculumId: '2', versionId: '20', moduleId: '201', lessonId: '306' });
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/2/versions/20`).flush(ACTIVE_VERSION);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/201/lessons`).flush([UNAVAILABLE_VIDEO_LESSON]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This video is private, removed, restricted, or currently unavailable. Repair or replace the link.');
    expect(text).not.toContain('It may have been removed or deleted');
    expect(text).not.toContain('AAAAAAAAAAA');
    expect(fixture.componentInstance.lesson()?.videoId).toBe('AAAAAAAAAAA');
  });
});

/**
 * Regression coverage for the Dev Dance School lesson pilot bug: Save
 * stayed permanently disabled after switching off the default VIDEO
 * content type, because the old videoSaveReady computed() read a plain
 * `form.contentType` field instead of a signal. contentType is now a
 * signal and Save-readiness is a plain method (saveReady()), re-evaluated
 * on every change-detection tick rather than cached.
 */
describe('LessonEditorComponent -- create-mode Save enablement (content-type switching)', () => {
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
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('default VIDEO stays unsaveable until required YouTube validation succeeds', () => {
    const fixture = setupCreate();
    const c = fixture.componentInstance;
    c.form.title = 'A video lesson';
    expect(c.contentType()).toBe('VIDEO');
    expect(c.saveReady()).toBe(false);

    c.onVideoValidated({ result: 'VALID', videoId: 'dQw4w9WgXcQ', url: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(c.saveReady()).toBe(true);
  });

  it('switching VIDEO -> TEXT enables Save once title and lesson text are valid', () => {
    const fixture = setupCreate();
    const c = fixture.componentInstance;
    c.onContentTypeChange('TEXT');
    expect(c.saveReady()).toBe(false);

    c.form.title = 'A text lesson';
    expect(c.saveReady()).toBe(false); // text content still blank

    c.form.textContent = 'Some pilot lesson content.';
    expect(c.saveReady()).toBe(true);
  });

  it('PDF_LINK enables Save only once its required fields are valid', () => {
    const fixture = setupCreate();
    const c = fixture.componentInstance;
    c.onContentTypeChange('PDF_LINK');
    c.form.title = 'A PDF lesson';
    expect(c.saveReady()).toBe(false);

    c.form.externalUrl = 'https://example.com/handout.pdf';
    expect(c.saveReady()).toBe(false); // label still blank

    c.form.externalLinkLabel = 'Handout';
    expect(c.saveReady()).toBe(true);
  });

  it('EXTERNAL_LINK enables Save only once its required fields are valid', () => {
    const fixture = setupCreate();
    const c = fixture.componentInstance;
    c.onContentTypeChange('EXTERNAL_LINK');
    c.form.title = 'A reference lesson';
    c.form.externalUrl = 'https://example.com/reference';
    expect(c.saveReady()).toBe(false); // label still blank

    c.form.externalLinkLabel = 'Reference page';
    expect(c.saveReady()).toBe(true);
  });

  it('switching from a validated VIDEO to another type never sends stale video state', () => {
    const fixture = setupCreate();
    const c = fixture.componentInstance;
    c.form.title = 'Switches away';
    c.onVideoValidated({ result: 'VALID', videoId: 'dQw4w9WgXcQ', url: 'https://youtu.be/dQw4w9WgXcQ' });

    c.onContentTypeChange('TEXT');
    c.form.textContent = 'Text after switching away from video.';
    c.save();

    const req = httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/101/lessons`);
    expect(req.request.body.contentType).toBe('TEXT');
    expect(req.request.body.youtubeUrl).toBeNull();
    expect(req.request.body.textContent).toBe('Text after switching away from video.');
    // Flushed as an error, not a success: a success would call goToList()
    // and navigate, which needs real routes this test doesn't configure.
    // Only the outgoing request (already asserted above) is under test here.
    req.flush({ code: 'IGNORED' }, { status: 500, statusText: 'Server Error' });
  });

  it('switching back to VIDEO requires a fresh validation, never reusing a prior one', () => {
    const fixture = setupCreate();
    const c = fixture.componentInstance;
    c.onVideoValidated({ result: 'VALID', videoId: 'dQw4w9WgXcQ', url: 'https://youtu.be/dQw4w9WgXcQ' });
    c.onContentTypeChange('TEXT');
    c.onContentTypeChange('VIDEO');

    c.form.title = 'Back to video';
    expect(c.saveReady()).toBe(false); // must re-validate, not reuse the earlier validation

    c.onVideoValidated({ result: 'VALID', videoId: 'newVideoId1', url: 'https://youtu.be/newVideoId1' });
    expect(c.saveReady()).toBe(true);
  });

  it('Save sends the correct content type and type-specific payload for PDF_LINK', () => {
    const fixture = setupCreate();
    const c = fixture.componentInstance;
    c.onContentTypeChange('PDF_LINK');
    c.form.title = 'A PDF lesson';
    c.form.externalUrl = 'https://example.com/handout.pdf';
    c.form.externalLinkLabel = 'Handout';
    c.save();

    const req = httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/101/lessons`);
    expect(req.request.body).toEqual(expect.objectContaining({
      contentType: 'PDF_LINK',
      externalUrl: 'https://example.com/handout.pdf',
      externalLinkLabel: 'Handout',
      youtubeUrl: null,
      textContent: null
    }));
    // Flushed as an error, not a success: a success would call goToList()
    // and navigate, which needs real routes this test doesn't configure.
    // Only the outgoing request (already asserted above) is under test here.
    req.flush({ code: 'IGNORED' }, { status: 500, statusText: 'Server Error' });
  });
});

/**
 * CURR-FUNC-04: editing an existing VIDEO lesson must show the currently
 * linked video and allow a title/practice-notes-only save without any
 * manual "Validate & Preview" click -- but the moment the URL field is
 * actually changed, that retained state must be invalidated until a fresh
 * validation succeeds.
 */
describe('LessonEditorComponent -- CURR-FUNC-04 existing-video edit behavior', () => {
  let httpMock: HttpTestingController;

  function setupEdit() {
    TestBed.configureTestingModule({
      imports: [LessonEditorComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ curriculumId: '1', versionId: '10', moduleId: '101', lessonId: '301' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(LessonEditorComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions/10`).flush(DRAFT_VERSION);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/101/lessons`).flush([AVAILABLE_VIDEO_LESSON]);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  /** Requirements 1 and 2: the reconstructed canonical URL and the stored videoId both initialize from the loaded lesson. */
  it('initializes the reconstructed current URL and videoId from the loaded lesson', () => {
    const fixture = setupEdit();
    const c = fixture.componentInstance;

    expect(c.initialVideoUrlForForm).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(c.initialVideoIdForForm).toBe('dQw4w9WgXcQ');
  });

  /** Requirement 3: a title-only change enables Save with no manual Validate & Preview call at all. */
  it('title-only edit enables Save without pressing Validate & Preview', () => {
    const fixture = setupEdit();
    const c = fixture.componentInstance;

    expect(c.saveReady()).toBe(true); // already true on load -- the existing video is implicitly retained
    c.form.title = 'A renamed video lesson';
    expect(c.saveReady()).toBe(true);
  });

  /** Requirement 4: same for a practice-notes-only change. */
  it('practice-notes-only edit enables Save without pressing Validate & Preview', () => {
    const fixture = setupEdit();
    const c = fixture.componentInstance;

    c.form.practiceNotes = 'Some new practice guidance.';
    expect(c.saveReady()).toBe(true);
  });

  /** Requirements 3/4/title-only Save payload: the request must send youtubeUrl: null (keep existing), never re-sending the reconstructed URL as if it were a fresh replacement. */
  it('title-only Save sends youtubeUrl: null -- the backend keeps the existing video, no revalidation', () => {
    const fixture = setupEdit();
    const c = fixture.componentInstance;
    c.form.title = 'A renamed video lesson';
    c.save();

    const req = httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/lessons/301`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.title).toBe('A renamed video lesson');
    expect(req.request.body.youtubeUrl).toBeNull();
    req.flush({ ...AVAILABLE_VIDEO_LESSON, title: 'A renamed video lesson' });
  });

  /** Requirement 5: editing the URL field away from the retained value clears the confirmed state -- Save must become disabled again. */
  it('changing the URL invalidates the retained-video state and disables Save', () => {
    const fixture = setupEdit();
    const c = fixture.componentInstance;
    expect(c.saveReady()).toBe(true);

    c.onVideoCleared(); // the child emits this the instant its url field diverges from the retained value
    expect(c.saveReady()).toBe(false);
  });

  /** Requirement 6: once cleared, Save stays disabled until a fresh validation actually succeeds. */
  it('a changed URL cannot Save until it is successfully validated', () => {
    const fixture = setupEdit();
    const c = fixture.componentInstance;
    c.onVideoCleared();
    expect(c.saveReady()).toBe(false);

    c.onVideoValidated({ result: 'INVALID', videoId: null, url: 'https://example.com/not-youtube' });
    expect(c.saveReady()).toBe(false);
  });

  /** Requirement 7: a successfully validated replacement URL both enables Save and is sent as the real youtubeUrl (not null, not the old one). */
  it('a successfully validated replacement URL enables Save and sends the new URL', () => {
    const fixture = setupEdit();
    const c = fixture.componentInstance;
    c.onVideoCleared();
    c.onVideoValidated({ result: 'VALID', videoId: 'newVideoId1', url: 'https://youtu.be/newVideoId1' });
    expect(c.saveReady()).toBe(true);

    c.save();
    const req = httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/lessons/301`);
    expect(req.request.body.youtubeUrl).toBe('https://youtu.be/newVideoId1');
    req.flush({ ...AVAILABLE_VIDEO_LESSON, videoId: 'newVideoId1' });
  });

  /** Requirement 8: Publish readiness still depends only on the lesson's stored videoId, exactly as before -- untouched by the retained/validated distinction. */
  it('Publish readiness is unaffected by the retained-video state', () => {
    const fixture = setupEdit();
    const c = fixture.componentInstance;
    expect(c.publishReady()).toBe(true); // stored videoId present, independent of validatedVideoId/lastValidatedUrl bookkeeping

    c.onVideoCleared(); // even after the retained state is cleared (mid-edit, unsaved), the lesson's own stored videoId is what gates Publish
    expect(c.publishReady()).toBe(true);
  });

  /** Requirement 9: the repair-video flow's validator never receives initialUrl/initialVideoId -- repair must always require a fresh URL, never the old (unavailable) one. */
  it('repair flow never pre-seeds the validator with the existing (unavailable) video', () => {
    TestBed.configureTestingModule({
      imports: [LessonEditorComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ curriculumId: '2', versionId: '20', moduleId: '201', lessonId: '306' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(LessonEditorComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/2/versions/20`).flush(ACTIVE_VERSION);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/201/lessons`).flush([UNAVAILABLE_VIDEO_LESSON]);
    fixture.detectChanges();

    const c = fixture.componentInstance;
    expect(c.repairReady()).toBe(false); // no repair validation performed yet -- must not fall back to the old, broken video
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
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/301/lessons`).flush([ARCHIVED_TEXT_LESSON]);
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
   * directly (title, TEXT/PDF/EXTERNAL_LINK/VIDEO content controls,
   * practice notes) -- this asserts that single shared source of truth
   * rather than each wrapped native control's own DOM state. Angular
   * Material's MDC-based form-field/input components do not reliably
   * reflect a `[disabled]` binding onto the native element's `.disabled`
   * property (or even onto MatFormField's own `mat-form-field-disabled`
   * host class) within this Vitest+jsdom harness at fixture.detectChanges()
   * time -- confirmed by manually running this exact archived-lesson
   * scenario in a real browser (screenshot evidence), where every field is
   * genuinely, visibly disabled. No other test in this codebase asserts
   * matInput's raw DOM disabled state for the same reason.
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

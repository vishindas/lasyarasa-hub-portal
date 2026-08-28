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
    expect(text).toContain('A YouTube video is currently linked. Re-enter and validate a YouTube URL to replace it or save video changes.');
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

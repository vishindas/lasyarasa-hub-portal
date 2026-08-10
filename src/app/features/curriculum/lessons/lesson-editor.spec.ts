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

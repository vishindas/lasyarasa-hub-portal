import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, Router, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Lesson } from '../../../core/models/curriculum.model';
import { LessonPreviewComponent } from './lesson-preview';

function activatedRouteStub(params: Record<string, string>, queryParams: Record<string, string> = {}) {
  return { snapshot: { paramMap: convertToParamMap(params), queryParamMap: convertToParamMap(queryParams) } };
}

const PUBLISHED_AVAILABLE_LESSON: Lesson = {
  id: 305, moduleId: 201, title: 'Namaskaram Demo', contentType: 'VIDEO', lessonOrder: 1, lifecycleStatus: 'PUBLISHED',
  videoId: 'dQw4w9WgXcQ', videoAvailability: 'AVAILABLE', textContent: null, externalUrl: null, externalLinkLabel: null,
  practiceNotes: null, rowVersion: 1, publishedAt: 'x', publishedBy: 1, archivedAt: null, archivedBy: null,
  attestedAt: 'x', attestedBy: 1
};

describe('LessonPreviewComponent -- video id stays internal, only drives the trusted embed src', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [LessonPreviewComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ curriculumId: '2', versionId: '20', moduleId: '201', lessonId: '305' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(LessonPreviewComponent);
  }

  afterEach(() => httpMock.verify());

  it('builds the youtube-nocookie embed src from the real video id, without printing the id as visible text', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/201/lessons`).flush([PUBLISHED_AVAILABLE_LESSON]);
    fixture.detectChanges();
    // check-video preflight (Slice 9 binding decision 3) fires automatically for a PUBLISHED+AVAILABLE video.
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/lessons/305/check-video`).flush(PUBLISHED_AVAILABLE_LESSON);
    fixture.detectChanges();

    const iframe = (fixture.nativeElement as HTMLElement).querySelector('iframe');
    expect(iframe?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=0');

    const visibleText = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(visibleText).not.toContain('dQw4w9WgXcQ');
  });
});

const PUBLISHED_TEXT_LESSON: Lesson = {
  id: 26, moduleId: 14, title: 'Indian Classical Dance', contentType: 'TEXT', lessonOrder: 1, lifecycleStatus: 'PUBLISHED',
  videoId: null, videoAvailability: null, textContent: 'body', externalUrl: null, externalLinkLabel: null,
  practiceNotes: null, rowVersion: 1, publishedAt: 'x', publishedBy: 1, archivedAt: null, archivedBy: null,
  attestedAt: 'x', attestedBy: 1
};

/**
 * Issue #54: `?from=preview` (fromPreview()) is the only thing that
 * distinguishes "opened from Curriculum Preview's read-only lessons list"
 * from the pre-existing "opened from the ordinary teacher lesson list"
 * entry point -- it must route Back/Previous/Next through that same
 * preview flow instead of dropping the teacher into the edit list.
 */
describe('LessonPreviewComponent -- Issue #54 fromPreview() navigation', () => {
  let httpMock: HttpTestingController;

  function setupFrom(queryParams: Record<string, string>) {
    TestBed.configureTestingModule({
      imports: [LessonPreviewComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ curriculumId: '8', versionId: '11', moduleId: '14', lessonId: '26' }, queryParams) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(LessonPreviewComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/modules/14/lessons`).flush([PUBLISHED_TEXT_LESSON]);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('close() returns to Curriculum Preview\'s lessons-preview list when opened with ?from=preview', () => {
    const fixture = setupFrom({ from: 'preview' });
    const router = TestBed.inject(Router);
    const navigateSpy = router.navigate = vi.fn().mockResolvedValue(true);

    fixture.componentInstance.close();

    expect(navigateSpy).toHaveBeenCalledWith(['/vidya-rasa/curricula', 8, 'versions', 11, 'modules', 14, 'lessons', 'preview']);
  });

  it('close() returns to the ordinary edit lesson list when opened normally (no ?from=preview) -- unchanged existing behavior', () => {
    const fixture = setupFrom({});
    const router = TestBed.inject(Router);
    const navigateSpy = router.navigate = vi.fn().mockResolvedValue(true);

    fixture.componentInstance.close();

    expect(navigateSpy).toHaveBeenCalledWith(['/vidya-rasa/curricula', 8, 'versions', 11, 'modules', 14, 'lessons']);
  });

  it('goTo() preserves ?from=preview across Previous/Next so the preview context survives multi-lesson navigation', () => {
    const other: Lesson = { ...PUBLISHED_TEXT_LESSON, id: 27, title: 'Second Lesson', lessonOrder: 2 };
    const fixture = setupFrom({ from: 'preview' });
    const router = TestBed.inject(Router);
    const navigateSpy = router.navigate = vi.fn().mockResolvedValue(true);

    fixture.componentInstance.goTo(other);

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/vidya-rasa/curricula', 8, 'versions', 11, 'modules', 14, 'lessons', 27, 'preview'],
      { queryParams: { from: 'preview' } }
    );
  });

  it('goTo() sends no query params when not in the preview flow -- unchanged existing behavior', () => {
    const other: Lesson = { ...PUBLISHED_TEXT_LESSON, id: 27, title: 'Second Lesson', lessonOrder: 2 };
    const fixture = setupFrom({});
    const router = TestBed.inject(Router);
    const navigateSpy = router.navigate = vi.fn().mockResolvedValue(true);

    fixture.componentInstance.goTo(other);

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/vidya-rasa/curricula', 8, 'versions', 11, 'modules', 14, 'lessons', 27, 'preview'],
      {}
    );
  });
});

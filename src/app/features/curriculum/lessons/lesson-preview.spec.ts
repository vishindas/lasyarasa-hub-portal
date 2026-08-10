import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Lesson } from '../../../core/models/curriculum.model';
import { LessonPreviewComponent } from './lesson-preview';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
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

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { LessonDetailComponent } from './lesson-detail';
import { ModuleDetailDTO, StudentLessonDetailDTO } from '../../../core/models/student-learning.model';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

const BASE = `${environment.apiUrl}/account/students/1/learning/classes/2/modules/9`;

const MODULE: ModuleDetailDTO = {
  moduleId: 9, title: 'Basic Adavus', moduleOrder: 1, status: 'RELEASED', objectives: 'x',
  lessons: [
    { lessonId: 501, title: 'Video lesson', contentType: 'VIDEO', lessonOrder: 1, videoAvailability: 'AVAILABLE' },
    { lessonId: 502, title: 'Text lesson', contentType: 'TEXT', lessonOrder: 2 }
  ]
};

describe('LessonDetailComponent', () => {
  let httpMock: HttpTestingController;

  function setup(lessonId: number, lesson: StudentLessonDetailDTO) {
    TestBed.configureTestingModule({
      imports: [LessonDetailComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ studentId: '1', classId: '2', moduleId: '9', lessonId: String(lessonId) }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(LessonDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${BASE}/lessons/${lessonId}`).flush(lesson);
    httpMock.expectOne(BASE).flush(MODULE);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('VIDEO + AVAILABLE: renders the nocookie embed built only from the resolved videoId', () => {
    const fixture = setup(501, {
      lessonId: 501, moduleId: 9, title: 'Video lesson', contentType: 'VIDEO', lessonOrder: 1,
      videoAvailability: 'AVAILABLE', videoId: 'dQw4w9WgXcQ', nextLessonId: 502
    });
    const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    expect((iframe.src ?? iframe.getAttribute('src')) as string).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect((iframe.src ?? iframe.getAttribute('src')) as string).not.toContain('autoplay=1');
  });

  it('VIDEO + UNAVAILABLE: renders the exact locked copy, no embed, no videoId anywhere in visible text (correction 5)', () => {
    const fixture = setup(501, {
      lessonId: 501, moduleId: 9, title: 'Video lesson', contentType: 'VIDEO', lessonOrder: 1,
      videoAvailability: 'UNAVAILABLE', previousLessonId: undefined, nextLessonId: 502
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This video is private, removed, restricted, or currently unavailable.');
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    expect(text).not.toContain('dQw4w9WgXcQ');
  });

  it('TEXT: renders textContent, no video frame', () => {
    const fixture = setup(502, {
      lessonId: 502, moduleId: 9, title: 'Text lesson', contentType: 'TEXT', lessonOrder: 2,
      textContent: 'Counting notes here.', previousLessonId: 501
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Counting notes here.');
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });

  it('PDF_LINK: renders a resource card with the label as a link', () => {
    const fixture = setup(503, {
      lessonId: 503, moduleId: 9, title: 'PDF lesson', contentType: 'PDF_LINK', lessonOrder: 3,
      externalUrl: 'https://example.test/x.pdf', externalLinkLabel: 'Practice sheet'
    });
    const link = fixture.nativeElement.querySelector('.resource-card a') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Practice sheet');
    expect(link.getAttribute('href')).toBe('https://example.test/x.pdf');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('EXTERNAL_LINK: same resource-card treatment as PDF_LINK', () => {
    const fixture = setup(504, {
      lessonId: 504, moduleId: 9, title: 'Reference', contentType: 'EXTERNAL_LINK', lessonOrder: 4,
      externalUrl: 'https://example.test/ref', externalLinkLabel: 'Reference recording'
    });
    const link = fixture.nativeElement.querySelector('.resource-card a') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Reference recording');
  });

  it('prev/next are disabled (not hidden) at module boundaries', () => {
    const fixture = setup(501, {
      lessonId: 501, moduleId: 9, title: 'Video lesson', contentType: 'VIDEO', lessonOrder: 1,
      videoAvailability: 'AVAILABLE', videoId: 'x', nextLessonId: 502
      // previousLessonId absent -- first lesson in module
    });
    const buttons = fixture.nativeElement.querySelectorAll('.nav-row button');
    expect(buttons.length).toBe(2);
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(true); // Previous
    expect((buttons[1] as HTMLButtonElement).disabled).toBe(false); // Next
  });

  it('position label is computed client-side from Module Detail\'s lessons list ("Lesson 1 of 2")', () => {
    const fixture = setup(501, {
      lessonId: 501, moduleId: 9, title: 'Video lesson', contentType: 'VIDEO', lessonOrder: 1,
      videoAvailability: 'AVAILABLE', videoId: 'x', nextLessonId: 502
    });
    expect(fixture.componentInstance.positionLabel()).toBe('Lesson 1 of 2');
  });
});

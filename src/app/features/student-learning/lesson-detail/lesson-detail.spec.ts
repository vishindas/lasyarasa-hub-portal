import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { LessonDetailComponent } from './lesson-detail';
import { ModuleDetailDTO, StudentContentBlock, StudentLessonDetailDTO } from '../../../core/models/student-learning.model';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

const BASE = `${environment.apiUrl}/account/students/1/learning/classes/2/modules/9`;

const MODULE: ModuleDetailDTO = {
  moduleId: 9, title: 'Basic Adavus', moduleOrder: 1, status: 'RELEASED', objectives: 'x',
  lessons: [
    { lessonId: 501, title: 'Video lesson', lessonOrder: 1 },
    { lessonId: 502, title: 'Text lesson', lessonOrder: 2 }
  ]
};

function block(overrides: Partial<StudentContentBlock> & { id: number; contentType: StudentContentBlock['contentType'] }): StudentContentBlock {
  return overrides;
}

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
      lessonId: 501, moduleId: 9, title: 'Video lesson', lessonOrder: 1,
      blocks: [block({ id: 1, contentType: 'VIDEO', videoAvailability: 'AVAILABLE', videoId: 'dQw4w9WgXcQ' })],
      nextLessonId: 502
    });
    const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    expect((iframe.src ?? iframe.getAttribute('src')) as string).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect((iframe.src ?? iframe.getAttribute('src')) as string).not.toContain('autoplay=1');
  });

  it('UX-4/Decision 5: the non-functional captions placeholder is gone -- no "Captions availability" text anywhere', () => {
    const fixture = setup(501, {
      lessonId: 501, moduleId: 9, title: 'Video lesson', lessonOrder: 1,
      blocks: [block({ id: 1, contentType: 'VIDEO', videoAvailability: 'AVAILABLE', videoId: 'dQw4w9WgXcQ' })],
      nextLessonId: 502
    });
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Captions availability');
  });

  /**
   * MC-4 judgment call (disclosed): the shared LessonBlockContentRendererComponent
   * (moved from admin, reused unchanged here) uses "This video is currently
   * unavailable." -- shorter than the pre-MC-4 student-only copy ("This
   * video is private, removed, restricted, or currently unavailable.").
   * Reusing one canonical primitive means one canonical string; the
   * architect's explicit instruction was to reuse the shared renderer, not
   * fork it to preserve two slightly different strings for the same state.
   */
  it('VIDEO + UNAVAILABLE: renders the shared unavailable-video copy, no embed, no videoId anywhere in visible text (correction 5)', () => {
    const fixture = setup(501, {
      lessonId: 501, moduleId: 9, title: 'Video lesson', lessonOrder: 1,
      blocks: [block({ id: 1, contentType: 'VIDEO', videoAvailability: 'UNAVAILABLE' })],
      nextLessonId: 502
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This video is currently unavailable.');
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    expect(text).not.toContain('dQw4w9WgXcQ');
  });

  it('TEXT: renders textContent, no video frame', () => {
    const fixture = setup(502, {
      lessonId: 502, moduleId: 9, title: 'Text lesson', lessonOrder: 2,
      blocks: [block({ id: 1, contentType: 'TEXT', textContent: 'Counting notes here.' })],
      previousLessonId: 501
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Counting notes here.');
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });

  it('PDF_LINK: renders a resource card with the label as a link, tagged "PDF document" (Finding 11)', () => {
    const fixture = setup(503, {
      lessonId: 503, moduleId: 9, title: 'PDF lesson', lessonOrder: 3,
      blocks: [block({ id: 1, contentType: 'PDF_LINK', externalUrl: 'https://example.test/x.pdf', externalLinkLabel: 'Practice sheet' })]
    });
    const link = fixture.nativeElement.querySelector('.resource-card a') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Practice sheet');
    expect(link.getAttribute('href')).toBe('https://example.test/x.pdf');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PDF document');
    expect(text).not.toContain('Opens in a new tab'); // EXTERNAL_LINK-only microcopy
  });

  it('EXTERNAL_LINK: same base resource-card treatment as PDF_LINK, but differentiated (Finding 11) -- destination domain + "Opens in a new tab"', () => {
    const fixture = setup(504, {
      lessonId: 504, moduleId: 9, title: 'Reference', lessonOrder: 4,
      blocks: [block({ id: 1, contentType: 'EXTERNAL_LINK', externalUrl: 'https://docs.example.test/ref', externalLinkLabel: 'Reference recording' })]
    });
    const link = fixture.nativeElement.querySelector('.resource-card a') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Reference recording');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('docs.example.test');
    expect(text).toContain('Opens in a new tab');
    expect(text).not.toContain('PDF document'); // PDF_LINK-only caption
  });

  it('EXTERNAL_LINK with an unparsable URL falls back to plain "Opens in a new tab", no domain, never a crash', () => {
    const b = block({ id: 1, contentType: 'EXTERNAL_LINK', externalUrl: 'not-a-valid-url', externalLinkLabel: 'Reference recording' });
    const fixture = setup(505, {
      lessonId: 505, moduleId: 9, title: 'Reference', lessonOrder: 5,
      blocks: [b]
    });
    expect(fixture.componentInstance.externalDomain(b)).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Opens in a new tab');
  });

  /**
   * MC-4: blocks-only cutover, architect-approved copy. An authorized
   * PUBLISHED lesson with no usable blocks stays a normal lesson page --
   * title/practice notes/prev-next nav all still render -- only the
   * content area shows the message. Never a 404/error screen.
   */
  it('empty blocks: shows the approved "This lesson\'s content isn\'t available right now." copy, but title/practice notes/nav all still render', () => {
    const fixture = setup(506, {
      lessonId: 506, moduleId: 9, title: 'Content not yet available', lessonOrder: 6,
      blocks: [],
      practiceNotes: 'Still worth reading.',
      previousLessonId: 505
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain("This lesson's content isn't available right now.");
    expect(text).toContain('Content not yet available'); // title
    expect(text).toContain('Still worth reading.'); // practice notes
    const buttons = fixture.nativeElement.querySelectorAll('.nav-row button');
    expect(buttons.length).toBe(2); // prev/next nav still renders
  });

  it('multiple blocks render in order', () => {
    const fixture = setup(507, {
      lessonId: 507, moduleId: 9, title: 'Multi-block lesson', lessonOrder: 7,
      blocks: [
        block({ id: 1, contentType: 'TEXT', textContent: 'First, warm up.' }),
        block({ id: 2, contentType: 'VIDEO', videoAvailability: 'AVAILABLE', videoId: 'dQw4w9WgXcQ' }),
        block({ id: 3, contentType: 'EXTERNAL_LINK', externalUrl: 'https://example.test/ref', externalLinkLabel: 'Reference' })
      ]
    });
    const el = fixture.nativeElement as HTMLElement;
    const blockItems = el.querySelectorAll('.block-item');
    expect(blockItems.length).toBe(3);
    expect(blockItems[0].textContent).toContain('First, warm up.');
    expect(blockItems[1].querySelector('iframe')).toBeTruthy();
    expect(blockItems[2].querySelector('a')?.textContent?.trim()).toBe('Reference');
  });

  it('prev/next are disabled (not hidden) at module boundaries', () => {
    const fixture = setup(501, {
      lessonId: 501, moduleId: 9, title: 'Video lesson', lessonOrder: 1,
      blocks: [block({ id: 1, contentType: 'VIDEO', videoAvailability: 'AVAILABLE', videoId: 'x' })],
      nextLessonId: 502
      // previousLessonId absent -- first lesson in module
    });
    const buttons = fixture.nativeElement.querySelectorAll('.nav-row button');
    expect(buttons.length).toBe(2);
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(true); // Previous
    expect((buttons[1] as HTMLButtonElement).disabled).toBe(false); // Next
  });

  it('position label is computed client-side from Module Detail\'s lessons list ("Lesson 1 of 2")', () => {
    const fixture = setup(501, {
      lessonId: 501, moduleId: 9, title: 'Video lesson', lessonOrder: 1,
      blocks: [block({ id: 1, contentType: 'VIDEO', videoAvailability: 'AVAILABLE', videoId: 'x' })],
      nextLessonId: 502
    });
    expect(fixture.componentInstance.positionLabel()).toBe('Lesson 1 of 2');
  });
});

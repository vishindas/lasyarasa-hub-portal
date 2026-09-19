import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LessonSummaryRowComponent } from './lesson-summary-row';
import { StudentLearningLessonSummaryDTO } from '../../../core/models/student-learning.model';

/**
 * MC-3: `contentType === undefined` (never a literal `null` -- the backend
 * DTO omits the field entirely via @JsonInclude(NON_NULL)) means the lesson
 * is block-native; student block-aware rendering is MC-4 scope, not yet
 * built, so this renders the same non-navigable "Coming soon" treatment
 * ModuleSummaryRowComponent already gives a LOCKED module (see its own spec
 * for the established pattern this mirrors).
 */
describe('LessonSummaryRowComponent', () => {
  function setup(lesson: StudentLearningLessonSummaryDTO) {
    TestBed.configureTestingModule({
      imports: [LessonSummaryRowComponent],
      providers: [provideRouter([])]
    });
    const fixture = TestBed.createComponent(LessonSummaryRowComponent);
    fixture.componentRef.setInput('lesson', lesson);
    return fixture;
  }

  it('a lesson with contentType undefined renders the non-navigable "Coming soon" row, no routerLink', () => {
    const fixture = setup({ lessonId: 501, title: 'A future lesson', lessonOrder: 1 });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Coming soon');
    expect((fixture.nativeElement as HTMLElement).querySelector('a')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="button"]')).not.toBeNull();
  });

  it('activating (click) a contentType-undefined row shows the inline note, without navigating', () => {
    const fixture = setup({ lessonId: 501, title: 'A future lesson', lessonOrder: 1 });
    fixture.detectChanges();

    expect(fixture.componentInstance.showPendingNote()).toBe(false);
    const row = (fixture.nativeElement as HTMLElement).querySelector('[role="button"]') as HTMLElement;
    row.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.showPendingNote()).toBe(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain("This lesson isn't available to view yet.");
  });

  it('a lesson with a real contentType renders the normal navigable row', () => {
    const fixture = setup({ lessonId: 502, title: 'A published lesson', contentType: 'TEXT', lessonOrder: 2 });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Coming soon');
    const link = (fixture.nativeElement as HTMLElement).querySelector('a') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.textContent).toContain('A published lesson');
  });

  it('a VIDEO lesson with UNAVAILABLE videoAvailability still renders navigable, with the Unavailable chip', () => {
    const fixture = setup({ lessonId: 503, title: 'A broken video', contentType: 'VIDEO', lessonOrder: 3, videoAvailability: 'UNAVAILABLE' });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Unavailable');
    expect((fixture.nativeElement as HTMLElement).querySelector('a')).not.toBeNull();
  });
});

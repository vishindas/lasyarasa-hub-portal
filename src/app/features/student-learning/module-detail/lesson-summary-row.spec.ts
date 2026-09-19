import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LessonSummaryRowComponent } from './lesson-summary-row';
import { StudentLearningLessonSummaryDTO } from '../../../core/models/student-learning.model';

/**
 * MC-4: `StudentLearningLessonSummaryDTO` no longer carries `contentType`/
 * `videoAvailability` at all -- the MC-3 temporary non-navigable "Coming
 * soon" state (for a not-yet-consumable block-native lesson) is removed
 * entirely, since every PUBLISHED lesson this list can return is now fully
 * consumable. Every row is unconditionally navigable.
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

  it('renders a navigable row with the lesson title', () => {
    const fixture = setup({ lessonId: 501, title: 'A published lesson', lessonOrder: 1 });
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.textContent).toContain('A published lesson');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Coming soon');
  });

  it('never renders a non-navigable/[role="button"] state -- there is no pending case left', () => {
    const fixture = setup({ lessonId: 502, title: 'Another lesson', lessonOrder: 2 });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="button"]')).toBeNull();
  });
});

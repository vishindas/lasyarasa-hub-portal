import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Lesson } from '../../../core/models/curriculum.model';
import { LessonListRowComponent } from './lesson-list-row';

function lesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: 1, moduleId: 101, title: 'A lesson', contentType: 'TEXT', lessonOrder: 1, lifecycleStatus: 'DRAFT',
    videoId: null, videoAvailability: null, textContent: 'body', externalUrl: null, externalLinkLabel: null,
    practiceNotes: null, rowVersion: 0, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null,
    attestedAt: null, attestedBy: null,
    ...overrides
  };
}

function setup(l: Lesson) {
  TestBed.configureTestingModule({
    imports: [LessonListRowComponent],
    providers: [provideAnimationsAsync()]
  });
  const fixture = TestBed.createComponent(LessonListRowComponent);
  fixture.componentRef.setInput('lesson', l);
  fixture.componentRef.setInput('position', 0);
  fixture.componentRef.setInput('total', 1);
  fixture.detectChanges();
  return fixture;
}

describe('LessonListRowComponent', () => {
  it('a normal typed lesson renders its own content-type label and icon', () => {
    const fixture = setup(lesson({ contentType: 'VIDEO' }));
    expect(fixture.componentInstance.typeLabel()).toBe('Video');
    expect(fixture.componentInstance.typeIcon()).toBe('play_circle');
  });

  /**
   * MC-3: `contentType === null` means block-native, not "no content" -- the
   * row must fall back to the "Multi-content lesson" label/icon rather than
   * indexing into CONTENT_TYPE_LABEL/CONTENT_TYPE_ICON with `null` (which
   * would throw/return undefined), and it must never say "No content yet"
   * (architect correction -- a block-native lesson may already hold several
   * complete blocks while contentType stays null by design).
   */
  it('a block-native lesson (contentType null) renders "Multi-content lesson" / view_agenda, never "No content yet", and does not throw', () => {
    expect(() => {
      const fixture = setup(lesson({ contentType: null }));
      expect(fixture.componentInstance.typeLabel()).toBe('Multi-content lesson');
      expect(fixture.componentInstance.typeIcon()).toBe('view_agenda');
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Multi-content lesson');
      expect(text).not.toContain('No content yet');
    }).not.toThrow();
  });
});

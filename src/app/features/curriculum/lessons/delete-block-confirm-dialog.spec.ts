import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { Lesson, LessonContentBlock } from '../../../core/models/curriculum.model';
import { DeleteBlockConfirmDialog, DeleteBlockConfirmData } from './delete-block-confirm-dialog';

const lessonsBase = `${environment.apiUrl}/school/curricula/versions/modules`;
const blocksBase = `${environment.apiUrl}/school/curricula/versions/modules/lessons`;

function lessonFixture(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: 301, moduleId: 101, title: 'A lesson', contentType: null, lessonOrder: 1, lifecycleStatus: 'DRAFT',
    videoId: null, videoAvailability: null, textContent: null, externalUrl: null, externalLinkLabel: null,
    practiceNotes: null, rowVersion: 5, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null,
    attestedAt: null, attestedBy: null,
    ...overrides
  };
}

function blockFixture(overrides: Partial<LessonContentBlock> = {}): LessonContentBlock {
  return {
    id: 1, lessonId: 301, contentType: 'VIDEO', displayOrder: 1,
    videoId: null, videoAvailability: null, textContent: null, externalUrl: null, externalLinkLabel: null,
    ...overrides
  };
}

/**
 * MC-3 architect correction: guarded delete, mirroring
 * DeleteQuestionConfirmDialog's own fresh-read-on-open behavior -- these
 * tests exercise the real HTTP calls the dialog fires on init, not a
 * synchronous open/close only.
 */
describe('DeleteBlockConfirmDialog (guarded delete)', () => {
  let closeSpy: ReturnType<typeof vi.fn>;
  let httpMock: HttpTestingController;

  const data: DeleteBlockConfirmData = { moduleId: 101, lessonId: 301, blockId: 1, contentTypeLabel: 'video' };

  function setup() {
    closeSpy = vi.fn();
    TestBed.configureTestingModule({
      imports: [DeleteBlockConfirmDialog],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close: closeSpy } },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DeleteBlockConfirmDialog);
    fixture.detectChanges();
    return fixture;
  }

  // ignoreCancelled: forkJoin unsubscribes from the sibling source the
  // instant one errors -- that cancelled (never flushed) request must not
  // fail verify() in the one test exercising that path.
  afterEach(() => httpMock.verify({ ignoreCancelled: true }));

  it('shows "Checking current status…" while the fresh re-read is in flight, and disables Remove', () => {
    const fixture = setup();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Checking current status');
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const remove = buttons.find(b => b.textContent?.trim() === 'Remove') as HTMLButtonElement;
    expect(remove.disabled).toBe(true);

    httpMock.expectOne(`${lessonsBase}/101/lessons`).flush([lessonFixture()]);
    httpMock.expectOne(`${blocksBase}/301/blocks`).flush([blockFixture({ id: 1 })]);
  });

  it('once the block and lesson are both confirmed present, Remove closes with the FRESH lesson rowVersion', () => {
    const fixture = setup();
    httpMock.expectOne(`${lessonsBase}/101/lessons`).flush([lessonFixture({ rowVersion: 8 })]);
    httpMock.expectOne(`${blocksBase}/301/blocks`).flush([blockFixture({ id: 1 })]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This block will be permanently removed');
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const remove = buttons.find(b => b.textContent?.trim() === 'Remove') as HTMLButtonElement;
    expect(remove.disabled).toBe(false);
    remove.click();

    expect(closeSpy).toHaveBeenCalledWith({ expectedLessonRowVersion: 8 });
  });

  it('Cancel closes with null, even mid-load', () => {
    const fixture = setup();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const cancel = buttons.find(b => b.textContent?.trim() === 'Cancel') as HTMLButtonElement;
    cancel.click();
    expect(closeSpy).toHaveBeenCalledWith(null);

    httpMock.expectOne(`${lessonsBase}/101/lessons`).flush([lessonFixture()]);
    httpMock.expectOne(`${blocksBase}/301/blocks`).flush([blockFixture({ id: 1 })]);
  });

  it('if the block is missing from the fresh re-read (deleted concurrently), shows the "no longer exists" state and disables Remove', () => {
    const fixture = setup();
    httpMock.expectOne(`${lessonsBase}/101/lessons`).flush([lessonFixture()]);
    httpMock.expectOne(`${blocksBase}/301/blocks`).flush([]); // block 1 is gone
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('no longer exists');
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const remove = buttons.find(b => b.textContent?.trim() === 'Remove') as HTMLButtonElement;
    expect(remove.disabled).toBe(true);
  });

  it('if the lesson itself is missing from the fresh re-read (deleted/archived concurrently), shows the "no longer exists" state', () => {
    const fixture = setup();
    httpMock.expectOne(`${lessonsBase}/101/lessons`).flush([]); // lesson 301 is gone
    httpMock.expectOne(`${blocksBase}/301/blocks`).flush([blockFixture({ id: 1 })]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('no longer exists');
  });

  it('a failed re-fetch (e.g. 404) also lands in the "no longer exists" state, never crashes', () => {
    const fixture = setup();
    // forkJoin unsubscribes from the sibling source the instant one errors --
    // the blocks request is cancelled by Angular itself, not flushed/errored here.
    httpMock.expectOne(`${lessonsBase}/101/lessons`).flush(
      { code: 'RESOURCE_NOT_FOUND', message: 'not found', resource: 'CurriculumModule' }, { status: 404, statusText: 'Not Found' }
    );
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('no longer exists');
  });
});

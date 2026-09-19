import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Lesson, LessonContentBlock } from '../../../core/models/curriculum.model';
import { LessonBlockListComponent } from './lesson-block-list';
import { DeleteBlockConfirmResult } from './delete-block-confirm-dialog';

const base = `${environment.apiUrl}/school/curricula/versions/modules/lessons`;

function blockFixture(overrides: Partial<LessonContentBlock> = {}): LessonContentBlock {
  return {
    id: 1, lessonId: 301, contentType: 'TEXT', displayOrder: 1,
    videoId: null, videoAvailability: null, textContent: 'body', externalUrl: null, externalLinkLabel: null,
    ...overrides
  };
}

function lessonFixture(rowVersion: number): Lesson {
  return {
    id: 301, moduleId: 101, title: 'A lesson', contentType: null, lessonOrder: 1, lifecycleStatus: 'DRAFT',
    videoId: null, videoAvailability: null, textContent: null, externalUrl: null, externalLinkLabel: null,
    practiceNotes: null, rowVersion, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null,
    attestedAt: null, attestedBy: null
  };
}

function setup(moduleId = 101, lessonId = 301, lessonRowVersion = 5, disabled = false) {
  TestBed.configureTestingModule({
    imports: [LessonBlockListComponent],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync()]
  });
  const httpMock = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(LessonBlockListComponent);
  const dialogOpenSpy = vi.fn();
  // Same override pattern portal-access-card.spec.ts uses -- DI-based
  // MatDialog spying is unreliable for a standalone component that itself
  // imports MatDialogModule, so the instance's own `dialog` field is
  // replaced directly instead.
  (fixture.componentInstance as unknown as { dialog: { open: typeof dialogOpenSpy } }).dialog = { open: dialogOpenSpy };
  fixture.componentRef.setInput('moduleId', moduleId);
  fixture.componentRef.setInput('lessonId', lessonId);
  fixture.componentRef.setInput('lessonRowVersion', lessonRowVersion);
  fixture.componentRef.setInput('disabled', disabled);
  fixture.detectChanges();
  return { fixture, httpMock, dialogOpenSpy };
}

function clickButtonContaining(el: HTMLElement, text: string) {
  const btn = Array.from(el.querySelectorAll('button')).find(b => b.textContent?.trim().includes(text)) as HTMLButtonElement;
  btn.click();
}

describe('LessonBlockListComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock.verify());

  it('loads blocks for the given lessonId on init', () => {
    const s = setup(101, 301, 5);
    httpMock = s.httpMock;
    const req = httpMock.expectOne(`${base}/301/blocks`);
    expect(req.request.method).toBe('GET');
    req.flush([blockFixture({ id: 1, displayOrder: 1 }), blockFixture({ id: 2, displayOrder: 2 })]);
    s.fixture.detectChanges();

    expect(s.fixture.componentInstance.blocks().length).toBe(2);
    expect(s.fixture.componentInstance.loading()).toBe(false);
  });

  it('architect correction: shows four explicit add actions (Add Text/Add Video/Add PDF/Add External Link), never a generic "Add Block" + picker', () => {
    const s = setup(101, 301, 5);
    httpMock = s.httpMock;
    httpMock.expectOne(`${base}/301/blocks`).flush([]);
    s.fixture.detectChanges();

    const el = s.fixture.nativeElement as HTMLElement;
    const buttonTexts = Array.from(el.querySelectorAll('button')).map(b => b.textContent?.trim());
    expect(buttonTexts.some(t => t?.includes('Add Text'))).toBe(true);
    expect(buttonTexts.some(t => t?.includes('Add Video'))).toBe(true);
    expect(buttonTexts.some(t => t?.includes('Add PDF'))).toBe(true);
    expect(buttonTexts.some(t => t?.includes('Add External Link'))).toBe(true);
    expect(buttonTexts.some(t => t === 'Add Block')).toBe(false);
    expect(el.querySelector('mat-button-toggle-group')).toBeNull();
  });

  it('"Add Text" opens the inline create editor already preselected to TEXT, and a successful create appends the new block and re-emits lessonUpdated with the response\'s fresh lesson', () => {
    const s = setup(101, 301, 5);
    httpMock = s.httpMock;
    httpMock.expectOne(`${base}/301/blocks`).flush([]);
    s.fixture.detectChanges();

    expect(s.fixture.componentInstance.addingType()).toBeNull();
    const el = s.fixture.nativeElement as HTMLElement;
    clickButtonContaining(el, 'Add Text');
    s.fixture.detectChanges();

    expect(s.fixture.componentInstance.addingType()).toBe('TEXT');
    expect(el.querySelector('app-lesson-block-editor')).not.toBeNull();

    let emittedLesson: Lesson | undefined;
    s.fixture.componentInstance.lessonUpdated.subscribe((l: Lesson) => (emittedLesson = l));

    const newBlock = blockFixture({ id: 9, contentType: 'TEXT', textContent: 'New block', displayOrder: 1 });
    const responseLesson = lessonFixture(6);
    s.fixture.componentInstance.saveNew({ contentType: 'TEXT', youtubeUrl: null, textContent: 'New block', externalUrl: null, externalLinkLabel: null });

    const req = httpMock.expectOne(`${base}/301/blocks`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      contentType: 'TEXT', youtubeUrl: null, textContent: 'New block', externalUrl: null, externalLinkLabel: null, expectedLessonRowVersion: 5
    });
    req.flush({ block: newBlock, lesson: responseLesson });

    expect(s.fixture.componentInstance.blocks().some(b => b.id === 9)).toBe(true);
    expect(s.fixture.componentInstance.addingType()).toBeNull();
    expect(emittedLesson).toEqual(responseLesson);
  });

  it('delete opens the guarded DeleteBlockConfirmDialog with moduleId/lessonId/blockId/label, and only calls the delete endpoint on confirm, using the DIALOG\'S fresh rowVersion (not this component\'s cached one)', () => {
    const s = setup(101, 301, 5);
    httpMock = s.httpMock;
    httpMock.expectOne(`${base}/301/blocks`).flush([blockFixture({ id: 1, contentType: 'VIDEO', displayOrder: 1 })]);
    s.fixture.detectChanges();

    s.dialogOpenSpy.mockReturnValue({ afterClosed: () => of(null) });
    s.fixture.componentInstance.confirmDelete(s.fixture.componentInstance.blocks()[0]);
    expect(s.dialogOpenSpy).toHaveBeenCalled();
    expect(s.dialogOpenSpy.mock.calls[0][1].data).toEqual({ moduleId: 101, lessonId: 301, blockId: 1, contentTypeLabel: 'video' });
    httpMock.expectNone(`${base}/301/blocks/1`);

    // Guarded delete: the dialog's own fresh re-read rowVersion (8) differs
    // from this component's cached lessonRowVersion input (5) -- proving
    // the fresh value, not the stale cached one, is what's actually sent.
    const guardedResult: DeleteBlockConfirmResult = { expectedLessonRowVersion: 8 };
    s.dialogOpenSpy.mockReturnValue({ afterClosed: () => of(guardedResult) });
    let emittedLesson: Lesson | undefined;
    s.fixture.componentInstance.lessonUpdated.subscribe((l: Lesson) => (emittedLesson = l));
    const responseLesson = lessonFixture(9);
    s.fixture.componentInstance.confirmDelete(s.fixture.componentInstance.blocks()[0]);

    const req = httpMock.expectOne(`${base}/301/blocks/1`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ expectedLessonRowVersion: 8 });
    req.flush(responseLesson);

    expect(s.fixture.componentInstance.blocks().length).toBe(0);
    expect(emittedLesson).toEqual(responseLesson);
  });

  it('moveUp sends the right ReorderLessonContentBlockEntry[] and re-sorts blocks by the response\'s displayOrder', () => {
    const s = setup(101, 301, 5);
    httpMock = s.httpMock;
    const b1 = blockFixture({ id: 1, displayOrder: 1 });
    const b2 = blockFixture({ id: 2, displayOrder: 2 });
    httpMock.expectOne(`${base}/301/blocks`).flush([b1, b2]);
    s.fixture.detectChanges();

    s.fixture.componentInstance.moveUp(1); // move the second block up

    const req = httpMock.expectOne(`${base}/301/blocks/reorder`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ expectedLessonRowVersion: 5, entries: [{ blockId: 2, newOrder: 1 }, { blockId: 1, newOrder: 2 }] });

    const responseLesson = lessonFixture(7);
    req.flush({ blocks: [{ ...b1, displayOrder: 2 }, { ...b2, displayOrder: 1 }], lesson: responseLesson });

    expect(s.fixture.componentInstance.blocks().map(b => b.id)).toEqual([2, 1]);
  });

  it('a drag-drop reorder (onDrop) sends the right entries too', () => {
    const s = setup(101, 301, 5);
    httpMock = s.httpMock;
    const b1 = blockFixture({ id: 1, displayOrder: 1 });
    const b2 = blockFixture({ id: 2, displayOrder: 2 });
    const b3 = blockFixture({ id: 3, displayOrder: 3 });
    httpMock.expectOne(`${base}/301/blocks`).flush([b1, b2, b3]);
    s.fixture.detectChanges();

    s.fixture.componentInstance.onDrop({ previousIndex: 2, currentIndex: 0 } as never);

    const req = httpMock.expectOne(`${base}/301/blocks/reorder`);
    expect(req.request.body).toEqual({
      expectedLessonRowVersion: 5,
      entries: [{ blockId: 3, newOrder: 1 }, { blockId: 1, newOrder: 2 }, { blockId: 2, newOrder: 3 }]
    });
    req.flush({ blocks: [{ ...b3, displayOrder: 1 }, { ...b1, displayOrder: 2 }, { ...b2, displayOrder: 3 }], lesson: lessonFixture(9) });

    expect(s.fixture.componentInstance.blocks().map(b => b.id)).toEqual([3, 1, 2]);
  });

  it('a 409 conflict on create surfaces the exact "before adding a block" copy', () => {
    const s = setup(101, 301, 5);
    httpMock = s.httpMock;
    httpMock.expectOne(`${base}/301/blocks`).flush([]);
    s.fixture.detectChanges();

    s.fixture.componentInstance.saveNew({ contentType: 'TEXT', youtubeUrl: null, textContent: 'x', externalUrl: null, externalLinkLabel: null });
    httpMock.expectOne(`${base}/301/blocks`).flush({ code: 'STALE_VERSION', message: 'stale', resource: null }, { status: 409, statusText: 'Conflict' });

    expect(s.fixture.componentInstance.actionError()?.message).toBe('This lesson changed elsewhere — reload before adding a block');
  });

  it('a 409 conflict on delete surfaces the exact "before removing this block" copy', () => {
    const s = setup(101, 301, 5);
    httpMock = s.httpMock;
    httpMock.expectOne(`${base}/301/blocks`).flush([blockFixture({ id: 1, contentType: 'TEXT', displayOrder: 1 })]);
    s.fixture.detectChanges();

    s.dialogOpenSpy.mockReturnValue({ afterClosed: () => of({ expectedLessonRowVersion: 5 } as DeleteBlockConfirmResult) });
    s.fixture.componentInstance.confirmDelete(s.fixture.componentInstance.blocks()[0]);
    httpMock.expectOne(`${base}/301/blocks/1`).flush({ code: 'STALE_VERSION', message: 'stale', resource: null }, { status: 409, statusText: 'Conflict' });

    expect(s.fixture.componentInstance.actionError()?.message).toBe('This lesson changed elsewhere — reload before removing this block');
  });

  it('a 409 conflict on reorder surfaces the exact "Block order changed elsewhere" copy', () => {
    const s = setup(101, 301, 5);
    httpMock = s.httpMock;
    const b1 = blockFixture({ id: 1, displayOrder: 1 });
    const b2 = blockFixture({ id: 2, displayOrder: 2 });
    httpMock.expectOne(`${base}/301/blocks`).flush([b1, b2]);
    s.fixture.detectChanges();

    s.fixture.componentInstance.moveDown(0);
    httpMock.expectOne(`${base}/301/blocks/reorder`).flush({ code: 'STALE_VERSION', message: 'stale', resource: null }, { status: 409, statusText: 'Conflict' });

    expect(s.fixture.componentInstance.actionError()?.message).toBe('Block order changed elsewhere — reload before reordering');
  });

  it('a 409 conflict on repair-video surfaces the exact "before repairing this block" copy', () => {
    const s = setup(101, 301, 5);
    httpMock = s.httpMock;
    const b1 = blockFixture({ id: 1, contentType: 'VIDEO', videoId: 'oldId', videoAvailability: 'UNAVAILABLE', displayOrder: 1 });
    httpMock.expectOne(`${base}/301/blocks`).flush([b1]);
    s.fixture.detectChanges();

    s.fixture.componentInstance.repairVideo(b1, 'https://youtu.be/newVideoId1');
    const req = httpMock.expectOne(`${base}/301/blocks/1/repair-video`);
    expect(req.request.body).toEqual({ url: 'https://youtu.be/newVideoId1', expectedLessonRowVersion: 5 });
    req.flush({ code: 'STALE_VERSION', message: 'stale', resource: null }, { status: 409, statusText: 'Conflict' });

    expect(s.fixture.componentInstance.actionError()?.message).toBe('This lesson changed elsewhere — reload before repairing this block');
  });

  describe('readyForPublish (architect correction: client-side publish readiness from currently-loaded block state)', () => {
    it('is false while loading', () => {
      const s = setup(101, 301, 5);
      httpMock = s.httpMock;
      expect(s.fixture.componentInstance.readyForPublish()).toBe(false);
      httpMock.expectOne(`${base}/301/blocks`).flush([]);
    });

    it('is false with zero blocks', () => {
      const s = setup(101, 301, 5);
      httpMock = s.httpMock;
      httpMock.expectOne(`${base}/301/blocks`).flush([]);
      s.fixture.detectChanges();
      expect(s.fixture.componentInstance.readyForPublish()).toBe(false);
    });

    it('is false with any incomplete block (VIDEO with no videoId)', () => {
      const s = setup(101, 301, 5);
      httpMock = s.httpMock;
      httpMock.expectOne(`${base}/301/blocks`).flush([
        blockFixture({ id: 1, contentType: 'TEXT', textContent: 'complete' }),
        blockFixture({ id: 2, contentType: 'VIDEO', videoId: null })
      ]);
      s.fixture.detectChanges();
      expect(s.fixture.componentInstance.readyForPublish()).toBe(false);
    });

    it('is false with a blank TEXT block', () => {
      const s = setup(101, 301, 5);
      httpMock = s.httpMock;
      httpMock.expectOne(`${base}/301/blocks`).flush([blockFixture({ id: 1, contentType: 'TEXT', textContent: '   ' })]);
      s.fixture.detectChanges();
      expect(s.fixture.componentInstance.readyForPublish()).toBe(false);
    });

    it('is false with a PDF_LINK block missing its label', () => {
      const s = setup(101, 301, 5);
      httpMock = s.httpMock;
      httpMock.expectOne(`${base}/301/blocks`).flush([
        blockFixture({ id: 1, contentType: 'PDF_LINK', externalUrl: 'https://example.com/x.pdf', externalLinkLabel: null })
      ]);
      s.fixture.detectChanges();
      expect(s.fixture.componentInstance.readyForPublish()).toBe(false);
    });

    it('is true when every block is locally complete', () => {
      const s = setup(101, 301, 5);
      httpMock = s.httpMock;
      httpMock.expectOne(`${base}/301/blocks`).flush([
        blockFixture({ id: 1, contentType: 'TEXT', textContent: 'complete' }),
        blockFixture({ id: 2, contentType: 'VIDEO', videoId: 'dQw4w9WgXcQ', videoAvailability: 'AVAILABLE' }),
        blockFixture({ id: 3, contentType: 'EXTERNAL_LINK', externalUrl: 'https://example.com', externalLinkLabel: 'Ref' })
      ]);
      s.fixture.detectChanges();
      expect(s.fixture.componentInstance.readyForPublish()).toBe(true);
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { LessonContentBlock, LessonContentType } from '../../../core/models/curriculum.model';
import { LessonBlockEditorComponent, LessonBlockEditorSaveEvent } from './lesson-block-editor';

function existingBlock(overrides: Partial<LessonContentBlock> = {}): LessonContentBlock {
  return {
    id: 55, lessonId: 301, contentType: 'VIDEO', displayOrder: 1,
    videoId: null, videoAvailability: null, textContent: null, externalUrl: null, externalLinkLabel: null,
    ...overrides
  };
}

function setupCreate(presetType: LessonContentType) {
  TestBed.configureTestingModule({
    imports: [LessonBlockEditorComponent],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync()]
  });
  const httpMock = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(LessonBlockEditorComponent);
  fixture.componentRef.setInput('mode', 'create');
  fixture.componentRef.setInput('presetContentType', presetType);
  fixture.detectChanges();
  return { fixture, httpMock };
}

function setupEdit(existing: LessonContentBlock) {
  TestBed.configureTestingModule({
    imports: [LessonBlockEditorComponent],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync()]
  });
  const httpMock = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(LessonBlockEditorComponent);
  fixture.componentRef.setInput('mode', 'edit');
  fixture.componentRef.setInput('existingBlock', existing);
  fixture.detectChanges();
  return { fixture, httpMock };
}

function clickButton(fixture: { nativeElement: unknown }, text: string) {
  const el = fixture.nativeElement as HTMLElement;
  const btn = Array.from(el.querySelectorAll('button')).find(b => b.textContent?.trim() === text) as HTMLButtonElement;
  btn.click();
}

describe('LessonBlockEditorComponent -- create mode (architect correction: type is preset, no in-editor toggle)', () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock?.verify());

  it('presetContentType drives contentType() -- no in-editor content-type toggle exists', () => {
    const s = setupCreate('VIDEO');
    httpMock = s.httpMock;
    expect(s.fixture.componentInstance.contentType()).toBe('VIDEO');
    const el = s.fixture.nativeElement as HTMLElement;
    expect(el.querySelector('mat-button-toggle-group')).toBeNull();
  });

  it('an unvalidated VIDEO block legally emits youtubeUrl: null (incomplete blocks are allowed)', () => {
    const s = setupCreate('VIDEO');
    httpMock = s.httpMock;
    const c = s.fixture.componentInstance;

    let emitted: LessonBlockEditorSaveEvent | undefined;
    c.save.subscribe((e: LessonBlockEditorSaveEvent) => (emitted = e));
    c.onSave();

    expect(emitted).toEqual({ contentType: 'VIDEO', youtubeUrl: null, textContent: null, externalUrl: null, externalLinkLabel: null });
  });

  it('a validated VIDEO block emits the validated url', () => {
    const s = setupCreate('VIDEO');
    httpMock = s.httpMock;
    const c = s.fixture.componentInstance;
    c.onVideoValidated({ result: 'VALID', videoId: 'dQw4w9WgXcQ', url: 'https://youtu.be/dQw4w9WgXcQ' });

    let emitted: LessonBlockEditorSaveEvent | undefined;
    c.save.subscribe((e: LessonBlockEditorSaveEvent) => (emitted = e));
    c.onSave();

    expect(emitted?.youtubeUrl).toBe('https://youtu.be/dQw4w9WgXcQ');
  });

  it('TEXT emits the entered text', () => {
    const s = setupCreate('TEXT');
    httpMock = s.httpMock;
    const c = s.fixture.componentInstance;
    c.textContent = 'Some block content.';

    let emitted: LessonBlockEditorSaveEvent | undefined;
    c.save.subscribe((e: LessonBlockEditorSaveEvent) => (emitted = e));
    c.onSave();

    expect(emitted).toEqual({ contentType: 'TEXT', youtubeUrl: null, textContent: 'Some block content.', externalUrl: null, externalLinkLabel: null });
  });

  it('PDF_LINK emits the url and label', () => {
    const s = setupCreate('PDF_LINK');
    httpMock = s.httpMock;
    const c = s.fixture.componentInstance;
    c.externalUrl = 'https://example.com/handout.pdf';
    c.externalLinkLabel = 'Handout';

    let emitted: LessonBlockEditorSaveEvent | undefined;
    c.save.subscribe((e: LessonBlockEditorSaveEvent) => (emitted = e));
    c.onSave();

    expect(emitted).toEqual({ contentType: 'PDF_LINK', youtubeUrl: null, textContent: null, externalUrl: 'https://example.com/handout.pdf', externalLinkLabel: 'Handout' });
  });

  it('EXTERNAL_LINK emits the url and label', () => {
    const s = setupCreate('EXTERNAL_LINK');
    httpMock = s.httpMock;
    const c = s.fixture.componentInstance;
    c.externalUrl = 'https://example.com/ref';
    c.externalLinkLabel = 'Reference';

    let emitted: LessonBlockEditorSaveEvent | undefined;
    c.save.subscribe((e: LessonBlockEditorSaveEvent) => (emitted = e));
    c.onSave();

    expect(emitted).toEqual({ contentType: 'EXTERNAL_LINK', youtubeUrl: null, textContent: null, externalUrl: 'https://example.com/ref', externalLinkLabel: 'Reference' });
  });

  it('Cancel emits cancel', () => {
    const s = setupCreate('TEXT');
    httpMock = s.httpMock;
    let cancelled = false;
    s.fixture.componentInstance.cancel.subscribe(() => (cancelled = true));
    clickButton(s.fixture, 'Cancel');
    expect(cancelled).toBe(true);
  });
});

describe('LessonBlockEditorComponent -- edit mode', () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock?.verify());

  it('pre-seeds a VIDEO block from existingBlock (its own contentType wins, presetContentType is ignored)', () => {
    const s = setupEdit(existingBlock({ contentType: 'VIDEO', videoId: 'dQw4w9WgXcQ' }));
    httpMock = s.httpMock;
    const c = s.fixture.componentInstance;

    expect(c.contentType()).toBe('VIDEO');
    expect(c.initialVideoUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(c.initialVideoId).toBe('dQw4w9WgXcQ');
  });

  it('pre-seeds a TEXT block from existingBlock', () => {
    const s = setupEdit(existingBlock({ contentType: 'TEXT', textContent: 'Existing text.' }));
    httpMock = s.httpMock;
    expect(s.fixture.componentInstance.textContent).toBe('Existing text.');
  });

  it('saving an untouched VIDEO block emits youtubeUrl: null (CURR-FUNC-04: keep existing)', () => {
    const s = setupEdit(existingBlock({ contentType: 'VIDEO', videoId: 'dQw4w9WgXcQ' }));
    httpMock = s.httpMock;
    const c = s.fixture.componentInstance;

    let emitted: LessonBlockEditorSaveEvent | undefined;
    c.save.subscribe((e: LessonBlockEditorSaveEvent) => (emitted = e));
    c.onSave();

    expect(emitted?.youtubeUrl).toBeNull();
  });

  it('saving a freshly-validated replacement VIDEO url emits the new url', () => {
    const s = setupEdit(existingBlock({ contentType: 'VIDEO', videoId: 'dQw4w9WgXcQ' }));
    httpMock = s.httpMock;
    const c = s.fixture.componentInstance;
    c.onVideoValidated({ result: 'VALID', videoId: 'newVideoId1', url: 'https://youtu.be/newVideoId1' });

    let emitted: LessonBlockEditorSaveEvent | undefined;
    c.save.subscribe((e: LessonBlockEditorSaveEvent) => (emitted = e));
    c.onSave();

    expect(emitted?.youtubeUrl).toBe('https://youtu.be/newVideoId1');
  });
});

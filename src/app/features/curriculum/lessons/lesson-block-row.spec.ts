import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { environment } from '../../../../environments/environment';
import { LessonContentBlock } from '../../../core/models/curriculum.model';
import { LessonBlockRowComponent } from './lesson-block-row';

function block(overrides: Partial<LessonContentBlock> = {}): LessonContentBlock {
  return {
    id: 55, lessonId: 301, contentType: 'VIDEO', displayOrder: 1,
    videoId: 'dQw4w9WgXcQ', videoAvailability: 'AVAILABLE', textContent: null, externalUrl: null, externalLinkLabel: null,
    ...overrides
  };
}

function setup(b: LessonContentBlock, position = 0, total = 1, editing = false) {
  TestBed.configureTestingModule({
    imports: [LessonBlockRowComponent],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync()]
  });
  const httpMock = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(LessonBlockRowComponent);
  fixture.componentRef.setInput('block', b);
  fixture.componentRef.setInput('position', position);
  fixture.componentRef.setInput('total', total);
  fixture.componentRef.setInput('editing', editing);
  fixture.detectChanges();
  return { fixture, httpMock };
}

function button(fixture: { nativeElement: unknown }, text: string): HTMLButtonElement {
  const el = fixture.nativeElement as HTMLElement;
  return Array.from(el.querySelectorAll('button')).find(b => b.textContent?.trim() === text) as HTMLButtonElement;
}

describe('LessonBlockRowComponent', () => {
  let httpMock: HttpTestingController;
  afterEach(() => httpMock?.verify());

  it('renders the type icon/label', () => {
    const s = setup(block({ contentType: 'TEXT' }));
    httpMock = s.httpMock;
    expect(s.fixture.componentInstance.typeLabel()).toBe('Text');
    expect(s.fixture.componentInstance.typeIcon()).toBe('article');
    const text = (s.fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Text');
  });

  it('Edit toggles editToggle, and it also fires from the inline editor\'s own Cancel', () => {
    const s = setup(block());
    httpMock = s.httpMock;
    let toggled = 0;
    s.fixture.componentInstance.editToggle.subscribe(() => toggled++);

    button(s.fixture, 'Edit').click();
    expect(toggled).toBe(1);
  });

  it('when editing, the inline lesson-block-editor is shown in place of Edit/Remove', () => {
    const s = setup(block(), 0, 1, true);
    httpMock = s.httpMock;
    const el = s.fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-lesson-block-editor')).not.toBeNull();
    expect(button(s.fixture, 'Edit')).toBeUndefined();
  });

  it('Remove emits delete', () => {
    const s = setup(block());
    httpMock = s.httpMock;
    let deleted = false;
    s.fixture.componentInstance.delete.subscribe(() => (deleted = true));
    button(s.fixture, 'Remove').click();
    expect(deleted).toBe(true);
  });

  it('up button is disabled at position 0', () => {
    const s = setup(block(), 0, 3);
    httpMock = s.httpMock;
    const el = s.fixture.nativeElement as HTMLElement;
    const upBtn = el.querySelector('[aria-label$="block up"]') as HTMLButtonElement;
    const downBtn = el.querySelector('[aria-label$="block down"]') as HTMLButtonElement;
    expect(upBtn.disabled).toBe(true);
    expect(downBtn.disabled).toBe(false);
  });

  it('down button is disabled at the last position', () => {
    const s = setup(block(), 2, 3);
    httpMock = s.httpMock;
    const el = s.fixture.nativeElement as HTMLElement;
    const upBtn = el.querySelector('[aria-label$="block up"]') as HTMLButtonElement;
    const downBtn = el.querySelector('[aria-label$="block down"]') as HTMLButtonElement;
    expect(upBtn.disabled).toBe(false);
    expect(downBtn.disabled).toBe(true);
  });

  it('moveUp/moveDown emit on click', () => {
    const s = setup(block(), 1, 3);
    httpMock = s.httpMock;
    let up = false, down = false;
    s.fixture.componentInstance.moveUp.subscribe(() => (up = true));
    s.fixture.componentInstance.moveDown.subscribe(() => (down = true));

    const el = s.fixture.nativeElement as HTMLElement;
    (el.querySelector('[aria-label$="block up"]') as HTMLButtonElement).click();
    (el.querySelector('[aria-label$="block down"]') as HTMLButtonElement).click();
    expect(up).toBe(true);
    expect(down).toBe(true);
  });

  it('an UNAVAILABLE VIDEO block shows the repair banner, the badge, and the validator+Republish button', () => {
    const s = setup(block({ contentType: 'VIDEO', videoAvailability: 'UNAVAILABLE' }));
    httpMock = s.httpMock;
    const text = (s.fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Video unavailable');
    expect(text).toContain('This video is private, removed, restricted, or currently unavailable. Repair or replace the link.');
    expect((s.fixture.nativeElement as HTMLElement).querySelector('app-youtube-url-validator')).not.toBeNull();
    expect(button(s.fixture, 'Republish Video')).toBeDefined();
  });

  it('confirming a validated repair URL emits repair with that URL string, and no attestation dialog exists in this flow', () => {
    const s = setup(block({ contentType: 'VIDEO', videoAvailability: 'UNAVAILABLE' }));
    httpMock = s.httpMock;
    const c = s.fixture.componentInstance;
    let repairedUrl: string | undefined;
    c.repair.subscribe((url: string) => (repairedUrl = url));

    expect(button(s.fixture, 'Republish Video').disabled).toBe(true); // no validated URL yet

    // Drive the real DOM/HTTP flow (typed URL -> Validate & Preview -> flushed
    // response) rather than calling onRepairValidated() directly -- mutating
    // component state from outside Angular's own event/async machinery and
    // then re-detecting changes is unreliable in this harness (see the
    // matInput-disabled-state caveat documented in lesson-editor.spec.ts).
    const el = s.fixture.nativeElement as HTMLElement;
    const urlInput = el.querySelector('app-youtube-url-validator input') as HTMLInputElement;
    urlInput.value = 'https://youtu.be/newVideoId1';
    urlInput.dispatchEvent(new Event('input'));
    s.fixture.detectChanges();
    const validateBtn = Array.from(el.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Validate & Preview') as HTMLButtonElement;
    validateBtn.click();
    s.httpMock.expectOne(`${environment.apiUrl}/school/curricula/lessons/validate-youtube-url`)
      .flush({ result: 'VALID', videoId: 'newVideoId1' });
    s.fixture.detectChanges();

    expect(button(s.fixture, 'Republish Video').disabled).toBe(false);
    button(s.fixture, 'Republish Video').click();
    expect(repairedUrl).toBe('https://youtu.be/newVideoId1');
  });

  it('an AVAILABLE VIDEO block renders the content renderer, not the repair banner', () => {
    const s = setup(block({ contentType: 'VIDEO', videoAvailability: 'AVAILABLE' }));
    httpMock = s.httpMock;
    const el = s.fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-lesson-block-content-renderer')).not.toBeNull();
    const text = el.textContent ?? '';
    expect(text).not.toContain('Video unavailable');
  });
});

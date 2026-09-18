import { TestBed } from '@angular/core/testing';
import { LessonContentBlock } from '../../../core/models/curriculum.model';
import { LessonBlockContentRendererComponent } from './lesson-block-content-renderer';

function block(overrides: Partial<LessonContentBlock> = {}): LessonContentBlock {
  return {
    id: 1, lessonId: 301, contentType: 'VIDEO', displayOrder: 1,
    videoId: null, videoAvailability: null, textContent: null, externalUrl: null, externalLinkLabel: null,
    ...overrides
  };
}

function setup(b: LessonContentBlock) {
  TestBed.configureTestingModule({ imports: [LessonBlockContentRendererComponent] });
  const fixture = TestBed.createComponent(LessonBlockContentRendererComponent);
  fixture.componentRef.setInput('block', b);
  fixture.detectChanges();
  return fixture;
}

describe('LessonBlockContentRendererComponent', () => {
  it('VIDEO with AVAILABLE videoId renders a youtube-nocookie embed iframe containing the video id', () => {
    const fixture = setup(block({ contentType: 'VIDEO', videoId: 'dQw4w9WgXcQ', videoAvailability: 'AVAILABLE' }));
    const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    expect(iframe.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=0');
  });

  it('VIDEO with UNAVAILABLE renders the unavailable placeholder, never an iframe', () => {
    const fixture = setup(block({ contentType: 'VIDEO', videoId: 'dQw4w9WgXcQ', videoAvailability: 'UNAVAILABLE' }));
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This video is currently unavailable.');
  });

  it('VIDEO with no videoId renders "No video selected yet."', () => {
    const fixture = setup(block({ contentType: 'VIDEO', videoId: null, videoAvailability: null }));
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No video selected yet.');
  });

  it('TEXT with content renders the text', () => {
    const fixture = setup(block({ contentType: 'TEXT', textContent: 'Practice notes here.' }));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Practice notes here.');
  });

  it('TEXT with blank content renders "No text added yet."', () => {
    const fixture = setup(block({ contentType: 'TEXT', textContent: null }));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No text added yet.');
  });

  it('PDF_LINK with both url and label renders a link with that label', () => {
    const fixture = setup(block({ contentType: 'PDF_LINK', externalUrl: 'https://example.com/handout.pdf', externalLinkLabel: 'Handout' }));
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Handout');
    expect(link.getAttribute('href')).toBe('https://example.com/handout.pdf');
  });

  it('PDF_LINK missing the url renders "No link added yet."', () => {
    const fixture = setup(block({ contentType: 'PDF_LINK', externalUrl: null, externalLinkLabel: 'Handout' }));
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No link added yet.');
  });

  it('EXTERNAL_LINK missing the label renders "No link added yet."', () => {
    const fixture = setup(block({ contentType: 'EXTERNAL_LINK', externalUrl: 'https://example.com/ref', externalLinkLabel: null }));
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No link added yet.');
  });

  it('EXTERNAL_LINK with both url and label renders a link with that label', () => {
    const fixture = setup(block({ contentType: 'EXTERNAL_LINK', externalUrl: 'https://example.com/ref', externalLinkLabel: 'Reference' }));
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Reference');
    expect(link.getAttribute('href')).toBe('https://example.com/ref');
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { environment } from '../../../../environments/environment';
import { YouTubeUrlValidatorComponent } from './youtube-url-validator';

describe('YouTubeUrlValidatorComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [YouTubeUrlValidatorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync()]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(YouTubeUrlValidatorComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('a successful validation never renders the raw video id -- only "Video validated successfully."', () => {
    const fixture = setup();
    fixture.componentInstance.url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    fixture.componentInstance.validate();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/lessons/validate-youtube-url`)
      .flush({ result: 'VALID', videoId: 'dQw4w9WgXcQ' });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Video validated successfully.');
    expect(text).not.toContain('dQw4w9WgXcQ');
  });

  it('still emits the real video id internally so the caller can drive the embed URL / API payload', () => {
    const fixture = setup();
    let emitted: { result: string; videoId: string | null } | undefined;
    fixture.componentInstance.validated.subscribe(e => (emitted = e));
    fixture.componentInstance.url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    fixture.componentInstance.validate();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/lessons/validate-youtube-url`)
      .flush({ result: 'VALID', videoId: 'dQw4w9WgXcQ' });
    fixture.detectChanges();

    expect(emitted?.videoId).toBe('dQw4w9WgXcQ');
  });

  it('UNAVAILABLE renders the exact locked copy, without claiming which specific reason applies', () => {
    const fixture = setup();
    fixture.componentInstance.url = 'https://www.youtube.com/watch?v=unavailable';
    fixture.componentInstance.validate();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/lessons/validate-youtube-url`)
      .flush({ result: 'UNAVAILABLE', videoId: null });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This video is private, removed, restricted, or currently unavailable.');
  });

  /** CURR-FUNC-04: a pre-seeded video (the Lesson Editor's ordinary edit path) shows its URL and is treated as already confirmed -- no network call, but the caller is still notified via the normal validated event. */
  it('pre-seeding with initialUrl/initialVideoId shows the URL and emits validated on init, with no HTTP call', () => {
    TestBed.configureTestingModule({
      imports: [YouTubeUrlValidatorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync()]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(YouTubeUrlValidatorComponent);
    fixture.componentRef.setInput('initialUrl', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    fixture.componentRef.setInput('initialVideoId', 'dQw4w9WgXcQ');
    let emitted: { result: string; videoId: string | null; url: string } | undefined;
    fixture.componentInstance.validated.subscribe(e => (emitted = e));

    fixture.detectChanges(); // runs ngOnInit

    expect(fixture.componentInstance.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(emitted).toEqual({ result: 'VALID', videoId: 'dQw4w9WgXcQ', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    httpMock.verify(); // no outstanding requests -- pre-seeding never calls the validation API
  });

  /** CURR-FUNC-04: editing the url away from whatever was last confirmed (pre-seeded or validated) must clear that confirmation and tell the caller. */
  it('editing the url away from the pre-seeded value clears the confirmed state and emits cleared', () => {
    TestBed.configureTestingModule({
      imports: [YouTubeUrlValidatorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync()]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(YouTubeUrlValidatorComponent);
    fixture.componentRef.setInput('initialUrl', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    fixture.componentRef.setInput('initialVideoId', 'dQw4w9WgXcQ');
    fixture.detectChanges();

    let clearedFired = false;
    fixture.componentInstance.cleared.subscribe(() => (clearedFired = true));
    fixture.componentInstance.url = 'https://youtu.be/differentVideo1';
    fixture.componentInstance.onUrlEdited();

    expect(clearedFired).toBe(true);
    expect(fixture.componentInstance.result()).toBeNull();
  });
});

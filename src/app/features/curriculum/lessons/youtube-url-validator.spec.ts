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
});

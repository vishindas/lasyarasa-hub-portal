import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { CURRICULUM_ROUTES } from './curricula.routes';
import { LessonListComponent } from './lessons/lesson-list';
import { LessonEditorComponent } from './lessons/lesson-editor';
import { LessonPreviewComponent } from './lessons/lesson-preview';

/**
 * Issue #54: real router-level tests (not a stubbed ActivatedRoute) for the
 * new `lessons/preview` route -- the one thing a component-level spec
 * structurally cannot prove is that this static segment actually matches
 * (and isn't shadowed by, or doesn't shadow, any sibling route) and that
 * `previewMode: true` genuinely reaches the resolved route's data. Tested
 * directly against CURRICULUM_ROUTES, standing in as the root config --
 * the real app nests this under /vidya-rasa/curricula
 * (vidya-rasa.routes.ts), which doesn't affect whether the path-matching
 * logic in this file itself is correct (same reasoning as
 * student-learning.routes.spec.ts).
 */
/** Walks to the deepest activated route, regardless of exact nesting depth -- robust against route-tree shape changes elsewhere in this file. */
function leafRoute(): ActivatedRouteSnapshot {
  let node = TestBed.inject(Router).routerState.snapshot.root;
  while (node.firstChild) node = node.firstChild;
  return node;
}

describe('CURRICULUM_ROUTES (Issue #54) -- lessons/preview route resolution', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(CURRICULUM_ROUTES),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync()
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Route-resolution is what's under test here, not the destination components' own data --
    // drain generically, same as student-learning.routes.spec.ts.
    httpMock.match(() => true).forEach(req => req.flush([]));
  });

  it('lessons/preview resolves to LessonListComponent with previewMode: true in route data', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/8/versions/11/modules/14/lessons/preview', LessonListComponent);

    expect(component).toBeInstanceOf(LessonListComponent);
    expect(TestBed.inject(Router).url).toBe('/8/versions/11/modules/14/lessons/preview');
    const leaf = leafRoute();
    expect(leaf.data['previewMode']).toBe(true);
  });

  it('the ordinary lessons/new route is unaffected -- resolves to LessonEditorComponent, no previewMode', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/8/versions/11/modules/14/lessons/new', LessonEditorComponent);

    expect(component).toBeInstanceOf(LessonEditorComponent);
    const leaf = leafRoute();
    expect(leaf.data['previewMode']).toBeUndefined();
  });

  it('the ordinary bare lessons route is unaffected -- resolves to LessonListComponent, no previewMode', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/8/versions/11/modules/14/lessons', LessonListComponent);

    expect(component).toBeInstanceOf(LessonListComponent);
    const leaf = leafRoute();
    expect(leaf.data['previewMode']).toBeUndefined();
  });

  it('lesson-level preview (lessons/:lessonId/preview) still resolves to LessonPreviewComponent, not shadowed by the new route', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/8/versions/11/modules/14/lessons/26/preview', LessonPreviewComponent);

    expect(component).toBeInstanceOf(LessonPreviewComponent);
    expect(TestBed.inject(Router).url).toBe('/8/versions/11/modules/14/lessons/26/preview');
  });
});

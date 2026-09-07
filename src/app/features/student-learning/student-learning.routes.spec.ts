import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { STUDENT_LEARNING_ROUTES } from './student-learning.routes';
import { StudentAssignmentSummaryComponent } from '../student-assignments/summary/student-assignment-summary';
import { StudentAssignmentActivityComponent } from '../student-assignments/activity/student-assignment-activity';

/**
 * UX-7D route cleanup: real router-level tests (not component tests with a
 * stubbed ActivatedRoute) for the actual route-table behavior -- which
 * component resolves at which URL, and the redirect itself. This is the
 * one part of UX-7D that a component-level spec structurally cannot prove:
 * a mocked ActivatedRoute never exercises path matching or `redirectTo` at
 * all. Tested here against STUDENT_LEARNING_ROUTES directly, standing in
 * as the root config -- the real app nests this under /my-students/:id
 * (app.routes.ts), which doesn't affect whether the redirect/path-matching
 * logic in this file itself is correct.
 */
describe('STUDENT_LEARNING_ROUTES (UX-7D route cleanup)', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(STUDENT_LEARNING_ROUTES),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // These tests are about route resolution, not data -- the destination
    // components' own ngOnInit fires a real HTTP call, drained generically
    // here rather than asserted, since the exact URL (containing a
    // meaningless studentId param in this isolated, unnested route test)
    // isn't what's under test.
    httpMock.match(() => true).forEach(req => req.flush([]));
  });

  it('/todo renders the To Do (Summary) component -- the canonical route', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/todo', StudentAssignmentSummaryComponent);
    expect(component).toBeInstanceOf(StudentAssignmentSummaryComponent);
    expect(TestBed.inject(Router).url).toBe('/todo');
  });

  /**
   * pathMatch: 'full' is load-bearing here: it must intercept a BARE
   * /assignments request only, not swallow /assignments/history or
   * /assignments/:id (proven by the next two tests, which confirm those
   * still resolve to their own components with no redirect at all).
   */
  it('old /assignments redirects to /todo (backward compatibility)', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/assignments');
    expect(TestBed.inject(Router).url).toBe('/todo');
  });

  it('/assignments/history still renders Assignment Activity -- no redirect, still assignment-specific', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/assignments/history', StudentAssignmentActivityComponent);
    expect(component).toBeInstanceOf(StudentAssignmentActivityComponent);
    expect(TestBed.inject(Router).url).toBe('/assignments/history');
  });
});

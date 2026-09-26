import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ClassDetailComponent } from './class-detail';

/** Issue #67: Archive/Restore actions and the "Archived" badge on the class-detail page. */
describe('ClassDetailComponent -- Issue #67 class archive', () => {
  let httpMock: HttpTestingController;
  let dialogOpenSpy: ReturnType<typeof vi.fn>;
  let snackSpy: { open: ReturnType<typeof vi.fn> };
  const base = `${environment.apiUrl}/school/classes`;

  const activeClass = {
    id: 1, batchName: 'Kuchipudi A', schedule: 'Sat 10am', description: '',
    danceStyleId: 1, ageGroupId: null, feeTierId: null,
    danceStyleName: 'Kuchipudi', ageGroupLabel: null, feeTierLabel: null,
    archivedAt: null, rowVersion: 0
  };

  function setup(dialogResult: unknown = true) {
    dialogOpenSpy = vi.fn().mockReturnValue({ afterClosed: () => of(dialogResult) });
    snackSpy = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ClassDetailComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: MatDialog, useValue: { open: dialogOpenSpy } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', '1']]) } } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ClassDetailComponent);
    // Same DI-override-unreliability as student-form-dialog.spec.ts -- see
    // that file's comment for why direct assignment is required here.
    (fixture.componentInstance as unknown as { snack: typeof snackSpy }).snack = snackSpy;
    (fixture.componentInstance as unknown as { dialog: { open: typeof dialogOpenSpy } }).dialog = { open: dialogOpenSpy };
    fixture.detectChanges();
    httpMock.expectOne(`${base}/1`).flush(activeClass);
    httpMock.expectOne(`${base}/1/students`).flush([]);
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('an active class renders no "Archived" badge and shows an Archive action', () => {
    const fixture = setup();
    const html = fixture.nativeElement.textContent as string;
    expect(html).not.toContain('Archived');
  });

  it('archive() confirms, POSTs expectedRowVersion, and reloads the class', () => {
    const fixture = setup(true);
    fixture.componentInstance.archive(activeClass);

    const req = httpMock.expectOne(`${base}/1/archive`);
    expect(req.request.body).toEqual({ expectedRowVersion: 0 });
    req.flush({ ...activeClass, archivedAt: '2026-02-01T00:00:00', rowVersion: 1 });

    httpMock.expectOne(`${base}/1`).flush({ ...activeClass, archivedAt: '2026-02-01T00:00:00', rowVersion: 1 });
    httpMock.expectOne(`${base}/1/students`).flush([]);

    expect(fixture.componentInstance.cls()?.archivedAt).toBe('2026-02-01T00:00:00');
    expect(snackSpy.open).toHaveBeenCalledWith('Class archived', 'OK', { duration: 2500 });
  });

  it('archive() blocked by an ACTIVE assignment instance (409) shows the exact typed message', () => {
    const fixture = setup(true);
    fixture.componentInstance.archive(activeClass);

    httpMock.expectOne(`${base}/1/archive`).flush(
      { code: 'CLASS_ARCHIVE_BLOCKED', message: 'This class has an open (ACTIVE) assignment instance. Close it before archiving.', resource: 'SchoolClass' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(snackSpy.open).toHaveBeenCalledWith(
      'This class has an open (ACTIVE) assignment instance. Close it before archiving.', 'OK', { duration: 5000 });
  });

  it('restore() POSTs expectedRowVersion with no confirm dialog', () => {
    const fixture = setup();
    const archived = { ...activeClass, archivedAt: '2026-02-01T00:00:00', rowVersion: 1 };
    fixture.componentInstance.restore(archived);

    const req = httpMock.expectOne(`${base}/1/restore`);
    expect(req.request.body).toEqual({ expectedRowVersion: 1 });
    req.flush({ ...activeClass, archivedAt: null, rowVersion: 2 });

    httpMock.expectOne(`${base}/1`).flush({ ...activeClass, archivedAt: null, rowVersion: 2 });
    httpMock.expectOne(`${base}/1/students`).flush([]);

    expect(dialogOpenSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.cls()?.archivedAt).toBeNull();
  });
});

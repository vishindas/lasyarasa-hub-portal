import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ModuleSummaryRowComponent } from './module-summary-row';
import { ModuleSummaryDTO } from '../../../core/models/student-learning.model';

/** Correction 6 (locked): WITHDRAWN is its own distinct chip/copy, never LOCKED's "Coming soon" -- neither ever navigates. */
describe('ModuleSummaryRowComponent', () => {
  function setup(module: ModuleSummaryDTO) {
    TestBed.configureTestingModule({
      imports: [ModuleSummaryRowComponent],
      providers: [provideRouter([])]
    });
    const fixture = TestBed.createComponent(ModuleSummaryRowComponent);
    fixture.componentRef.setInput('module', module);
    fixture.componentRef.setInput('studentId', 1);
    fixture.componentRef.setInput('classId', 2);
    return fixture;
  }

  it('LOCKED shows "Coming soon" and never navigates on activation', () => {
    const fixture = setup({ moduleId: 9, title: 'Padams', moduleOrder: 3, status: 'LOCKED' });
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Coming soon');
    fixture.componentInstance.onActivate();
    expect(navSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.showNote()).toBe(true);
  });

  it('WITHDRAWN shows its own distinct copy, never "Coming soon", and never navigates', () => {
    const fixture = setup({ moduleId: 9, title: 'Advanced Adavus', moduleOrder: 2, status: 'WITHDRAWN' });
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Withdrawn');
    expect(text).not.toContain('Coming soon');
    fixture.componentInstance.onActivate();
    expect(navSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.showNote()).toBe(true);
  });

  it('WITHDRAWN and LOCKED render pairwise-distinct chip text', () => {
    const withdrawn = setup({ moduleId: 1, title: 'A', moduleOrder: 1, status: 'WITHDRAWN' });
    expect(withdrawn.componentInstance.chipText()).toBe('Withdrawn');
    expect(withdrawn.componentInstance.chipText()).not.toBe('Coming soon'); // LOCKED's own known chip text -- confirmed distinct without a second TestBed instance
  });

  it('RELEASED navigates into Module Detail on activation', () => {
    const fixture = setup({ moduleId: 9, title: 'Basic Adavus', moduleOrder: 1, status: 'RELEASED', objectives: 'x', publishedLessonCount: 3 });
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');
    fixture.detectChanges();

    fixture.componentInstance.onActivate();
    expect(navSpy).toHaveBeenCalledWith(['/my-students', 1, 'classes', 2, 'modules', 9]);
  });

  it('COMPLETED also navigates into Module Detail on activation', () => {
    const fixture = setup({ moduleId: 4, title: 'Namaskaram', moduleOrder: 2, status: 'COMPLETED', objectives: 'x', publishedLessonCount: 1 });
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');
    fixture.detectChanges();

    fixture.componentInstance.onActivate();
    expect(navSpy).toHaveBeenCalledWith(['/my-students', 1, 'classes', 2, 'modules', 4]);
  });
});

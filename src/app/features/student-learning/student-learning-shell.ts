import { Component, DestroyRef, Injector, OnInit, afterNextRender, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { StudentLearningContextService } from '../../core/services/student-learning-context.service';
import { StudentAccessLossService } from '../../core/services/student-access-loss.service';
import { OfflineDetectionService } from '../../core/services/offline-detection.service';
import { ClassroomLiteModeService } from '../../core/services/classroom-lite-mode.service';
import { StudentSwitcherComponent } from './student-switcher';
import { ClassContextBarComponent } from './class-context-bar';
import { FullOutageBlockComponent } from '../../shared/curriculum/full-outage-block';
import { OfflineBlockComponent } from './offline-block';
import { LostAccessBlockComponent } from './lost-access-block';

/**
 * Route-level wrapper for every /my-students/:studentId/... screen. Owns
 * state-precedence exactly per Part III.1: FULL_OUTAGE/offline first
 * (suppress everything, including the header -- "no partial/stale content
 * shown underneath"), then lost-student-access scoped to the *currently
 * routed* studentId (header/switcher stay, since "Back to My Students" and
 * switching to a still-accessible student are both valid escapes), then
 * ordinary route content. Also owns the one-time-per-student classes fetch
 * (avoids every child screen independently re-requesting the same list)
 * and the route-change H1-focus mechanism the verified v1.1.2 contract
 * requires after every switcher selection.
 */
@Component({
  selector: 'app-student-learning-shell',
  standalone: true,
  imports: [RouterOutlet, StudentSwitcherComponent, ClassContextBarComponent, FullOutageBlockComponent, OfflineBlockComponent, LostAccessBlockComponent],
  styles: [`
    :host { display: block; min-height: 100vh; background: #FBF7EC; }
    .header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; background: #1C1A16; color: #FAF6EC;
    }
    .brand { font-family: Fraunces, Georgia, serif; font-weight: 700; }
  `],
  template: `
    @if (mode.mode() === 'FULL_OUTAGE') {
      <app-full-outage-block />
    } @else if (offline.offline()) {
      <app-offline-block (retry)="reload()" />
    } @else {
      <header class="header">
        <span class="brand">LasyaRasa</span>
        <app-student-switcher [currentStudentId]="studentId()" />
      </header>
      @if (accessLoss.lostAccessFor() === studentId()) {
        <app-lost-access-block (backToMyStudents)="backToMyStudents()" />
      } @else {
        <app-class-context-bar [classes]="context.classes()" [selectedClassId]="context.selectedClassId()" (classSelected)="onClassSelected($event)" />
        <router-outlet />
      }
    }
  `
})
export class StudentLearningShellComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  auth = inject(AuthService);
  context = inject(StudentLearningContextService);
  accessLoss = inject(StudentAccessLossService);
  offline = inject(OfflineDetectionService);
  mode = inject(ClassroomLiteModeService);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);

  studentId = signal<number>(0);

  constructor() {
    // v1.1.2 verified contract: selecting a switcher option moves focus to
    // the resulting page's H1. Centralized here (once) rather than
    // duplicated per screen -- applies to every navigation within this
    // shell, not just switcher-driven ones, which is the correct general
    // SPA route-change focus behavior the design also asks for.
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe(() => {
      afterNextRender(() => this.focusPageHeading(), { injector: this.injector });
    });
  }

  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const id = Number(params.get('studentId'));
      if (id !== this.studentId()) {
        this.studentId.set(id);
        this.accessLoss.clear();
        this.context.clearForNewStudent(id);
      }
    });
  }

  private focusPageHeading() {
    const h1 = document.querySelector<HTMLElement>('main h1, [role="main"] h1, h1[tabindex="-1"]');
    if (h1) {
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: false });
    }
  }

  onClassSelected(classId: number) {
    this.context.selectClass(classId);
    this.router.navigate(['/my-students', this.studentId(), 'classes', classId, 'path']);
  }

  backToMyStudents() {
    this.router.navigate(['/my-students']);
  }

  reload() {
    this.context.clearForNewStudent(this.studentId());
  }
}

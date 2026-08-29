import { Component, DestroyRef, Injector, OnInit, afterNextRender, effect, inject, signal } from '@angular/core';
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
import { AccountMenuComponent } from '../../shared/account-menu/account-menu';

/**
 * Route-level wrapper for every /my-students/:studentId/... screen. Owns
 * state-precedence exactly per Part III.1: FULL_OUTAGE/offline first
 * (suppress everything, including the header -- "no partial/stale content
 * shown underneath"), then lost-student-access scoped to the *currently
 * routed* studentId, then ordinary route content. Also owns the
 * one-time-per-student classes fetch (avoids every child screen
 * independently re-requesting the same list) and the route-change
 * H1-focus mechanism the verified v1.1.2 contract requires after every
 * switcher selection.
 *
 * Security correction (found via manual review): lost access must hide
 * EVERYTHING student-derived, including the switcher itself -- it shows
 * the routed student's own name, so "header/switcher stay as a valid
 * escape" was wrong; "Back to My Students" is the only escape now. There
 * is no separate authenticated-account-identity menu in this header only
 * `auth` (AuthService) is injected and it renders nothing on its own --
 * if one is ever added, it must show the signed-in account's own
 * identity, never anything student-derived, and so is exempt from this
 * suppression; until then there is nothing else here to preserve.
 * The effect() below actively clears StudentLearningContextService's
 * selection (not just suppresses rendering) the moment access is lost,
 * so no later re-render, re-navigation, or query-param change can surface
 * the previous student's class name without a fresh, successful
 * authorization response first.
 *
 * D6: AccountMenuComponent (email/change-password/sign-out) fills the
 * "separate authenticated-account-identity menu" this comment already
 * anticipated -- it shows only the signed-in account's own identity, never
 * anything student-derived, so it is deliberately placed outside the
 * lost-access suppression below, unlike the switcher.
 */
@Component({
  selector: 'app-student-learning-shell',
  standalone: true,
  imports: [RouterOutlet, StudentSwitcherComponent, ClassContextBarComponent, FullOutageBlockComponent, OfflineBlockComponent, LostAccessBlockComponent, AccountMenuComponent],
  styles: [`
    :host { display: block; min-height: 100vh; background: #FBF7EC; }
    .header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; background: #1C1A16; color: #FAF6EC;
    }
    .brand { font-family: Fraunces, Georgia, serif; font-weight: 700; }
    .header-actions { display: flex; align-items: center; gap: 2px; }
  `],
  template: `
    @if (mode.mode() === 'FULL_OUTAGE') {
      <app-full-outage-block />
    } @else if (offline.offline()) {
      <app-offline-block (retry)="reload()" />
    } @else {
      <header class="header">
        <span class="brand">LasyaRasa</span>
        <div class="header-actions">
          <!-- Security fix: the switcher must never render while access is
               lost for the currently routed student -- it must not show
               that student's name, and "pick a different student instead"
               is what "Back to My Students" is for. -->
          @if (accessLoss.lostAccessFor() !== studentId()) {
            <app-student-switcher [currentStudentId]="studentId()" />
          }
          <!-- D6: the signed-in account's own identity, never student-
               derived, so it stays visible even during lost-access. -->
          <app-account-menu />
        </div>
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

    // Security: actively clears the shared class-selection state (not just
    // a template-level rendering suppression) the instant access is lost
    // for the currently routed student. Purely synchronous -- no HTTP call
    // is started here, so this is safe to run as a constructor effect.
    effect(() => {
      if (this.accessLoss.lostAccessFor() === this.studentId()) {
        this.context.clearSelection();
      }
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
    // D1 addition: switching class while already on the Dashboard stays on
    // the Dashboard rather than jumping to Learning Path -- every other
    // existing screen keeps its unchanged behavior below. The classId
    // query param makes this a genuinely different navigation (Angular
    // reuses the same component instance for a same-route, query-only
    // navigation and emits a fresh queryParamMap value rather than
    // rerunning ngOnInit) so Dashboard can react to it without needing the
    // router to destroy/recreate the component.
    if (this.router.url.includes('/dashboard')) {
      this.router.navigate(['/my-students', this.studentId(), 'dashboard'], { queryParams: { classId } });
      return;
    }
    this.router.navigate(['/my-students', this.studentId(), 'classes', classId, 'path']);
  }

  backToMyStudents() {
    this.router.navigate(['/my-students']);
  }

  reload() {
    this.context.clearForNewStudent(this.studentId());
  }
}
